import { createClient } from "@/lib/supabase/server";
import {
  APPLIED_OR_BEYOND,
  RESPONDED_STATUSES,
  type Status,
} from "@/lib/constants";
import type {
  Application,
  StatusHistory,
  Task,
  Interview,
  Document,
  PrepNote,
  Contact,
} from "@/lib/database.types";
import {
  IS_DEMO,
  demoGetApplicationsWithSignals,
  demoGetApplications,
  demoGetApplicationDetail,
  demoGetTasks,
  demoGetDashboardStats,
  demoGetDocuments,
  demoGetCalendarEvents,
  demoGetAnalyticsRaw,
  demoGetPrepNotes,
  demoGetApplicationPrep,
  demoGetContacts,
  demoGetContactsForApplication,
  demoGetReminderRaw,
} from "@/lib/demo";
import {
  computeAnalytics,
  type AnalyticsData,
  type AnalyticsFilters,
  type AppRow,
  type HistoryRow,
} from "@/lib/analytics";
import { computeReminders, type Nudge } from "@/lib/reminders";

// A board card needs the application plus one contextual signal.
export type ApplicationWithSignals = Application & {
  nextTaskDue: string | null;
  nextInterviewAt: string | null;
};

// A task row enriched with its application's company, for the tasks list.
export type TaskWithApplication = Task & {
  application: { id: string; company: string } | null;
};

// One normalized event shape for the calendar (interviews + dated tasks).
export type CalendarEvent = {
  id: string;
  kind: "interview" | "task";
  title: string;
  date: string; // ISO timestamp
  applicationId: string | null;
  company: string | null;
  interview: Interview | null;
  task: Task | null;
};

export type ApplicationDetail = {
  application: Application;
  tasks: Task[];
  history: StatusHistory[];
  interviews: Interview[];
  attachedDocuments: Document[];
};

export type DashboardStats = {
  active: number;
  responseRate: number | null; // 0..1, or null if nothing applied yet
  respondedCount: number;
  appliedCount: number;
  appliedThisWeek: number;
  tasksDueSoon: number;
};

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// All applications with their board signals (next task due, next interview).
export async function getApplicationsWithSignals(): Promise<
  ApplicationWithSignals[]
> {
  if (IS_DEMO) return demoGetApplicationsWithSignals();
  const { supabase } = await requireUserId();

  const [{ data: apps }, { data: tasks }, { data: interviews }] =
    await Promise.all([
      supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("application_id, due_date")
        .eq("status", "todo")
        .not("due_date", "is", null)
        .not("application_id", "is", null)
        .order("due_date", { ascending: true }),
      supabase
        .from("interviews")
        .select("application_id, scheduled_at")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true }),
    ]);

  // First seen wins because both lists are sorted ascending by date.
  const nextTask = new Map<string, string>();
  for (const t of tasks ?? []) {
    if (t.application_id && t.due_date && !nextTask.has(t.application_id)) {
      nextTask.set(t.application_id, t.due_date);
    }
  }
  const nextInterview = new Map<string, string>();
  for (const iv of interviews ?? []) {
    if (
      iv.application_id &&
      iv.scheduled_at &&
      !nextInterview.has(iv.application_id)
    ) {
      nextInterview.set(iv.application_id, iv.scheduled_at);
    }
  }

  return (apps ?? []).map((a) => ({
    ...a,
    nextTaskDue: nextTask.get(a.id) ?? null,
    nextInterviewAt: nextInterview.get(a.id) ?? null,
  }));
}

// Flat list of applications (for the table view).
export async function getApplications(): Promise<Application[]> {
  if (IS_DEMO) return demoGetApplications();
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getApplicationDetail(
  id: string,
): Promise<ApplicationDetail | null> {
  if (IS_DEMO) return demoGetApplicationDetail(id);
  const { supabase } = await requireUserId();

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!application) return null;

  const [
    { data: tasks },
    { data: history },
    { data: interviews },
    { data: attachRows },
  ] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("application_id", id)
        .order("status", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("status_history")
        .select("*")
        .eq("application_id", id)
        .order("changed_at", { ascending: true }),
      supabase
        .from("interviews")
        .select("*")
        .eq("application_id", id)
        .order("scheduled_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("application_documents")
        .select("document_id")
        .eq("application_id", id),
    ]);

  // Resolve attached documents in a second step (avoids relying on a declared
  // FK relationship in the generated types).
  const docIds = (attachRows ?? []).map((r) => r.document_id);
  let attachedDocuments: Document[] = [];
  if (docIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .in("id", docIds);
    attachedDocuments = docs ?? [];
  }

  return {
    application,
    tasks: tasks ?? [],
    history: history ?? [],
    interviews: interviews ?? [],
    attachedDocuments,
  };
}

export async function getTasks(): Promise<TaskWithApplication[]> {
  if (IS_DEMO) return demoGetTasks();
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("tasks")
    .select("*, application:applications(id, company)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  // The FK tasks.application_id -> applications(id) makes this embed work at
  // runtime; our hand-written types don't declare the relation, so cast.
  return (data ?? []) as unknown as TaskWithApplication[];
}

export type PrepNoteWithApplication = PrepNote & {
  application: { id: string; company: string } | null;
};

// All prep notes for the user, with the linked application's company (if any).
export async function getPrepNotes(): Promise<PrepNoteWithApplication[]> {
  if (IS_DEMO) return demoGetPrepNotes();
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("prep_notes")
    .select("*, application:applications(id, company)")
    .order("updated_at", { ascending: false });
  return (data ?? []) as unknown as PrepNoteWithApplication[];
}

// For the application detail: this app's research notes + all reusable STAR
// stories (a handy read-only glance before an interview).
export async function getApplicationPrep(
  applicationId: string,
): Promise<{ research: PrepNote[]; star: PrepNote[] }> {
  if (IS_DEMO) return demoGetApplicationPrep(applicationId);
  const { supabase } = await requireUserId();
  const [{ data: research }, { data: star }] = await Promise.all([
    supabase
      .from("prep_notes")
      .select("*")
      .eq("category", "research")
      .eq("application_id", applicationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("prep_notes")
      .select("*")
      .eq("category", "star")
      .order("updated_at", { ascending: false }),
  ]);
  return { research: research ?? [], star: star ?? [] };
}

export type ContactWithApplication = Contact & {
  application: { id: string; company: string } | null;
};

export async function getContacts(): Promise<ContactWithApplication[]> {
  if (IS_DEMO) return demoGetContacts();
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("contacts")
    .select("*, application:applications(id, company)")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as ContactWithApplication[];
}

export async function getContactsForApplication(
  applicationId: string,
): Promise<Contact[]> {
  if (IS_DEMO) return demoGetContactsForApplication(applicationId);
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getDocuments(): Promise<Document[]> {
  if (IS_DEMO) return demoGetDocuments();
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("type", { ascending: true })
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Interviews + dated tasks within [rangeStart, rangeEnd], normalized so the
// calendar has a single clean data source.
export async function getCalendarEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarEvent[]> {
  if (IS_DEMO) return demoGetCalendarEvents(rangeStart, rangeEnd);
  const { supabase } = await requireUserId();

  const [{ data: interviews }, { data: tasks }, { data: apps }] =
    await Promise.all([
      supabase
        .from("interviews")
        .select("*")
        .not("scheduled_at", "is", null)
        .gte("scheduled_at", rangeStart)
        .lte("scheduled_at", rangeEnd),
      supabase
        .from("tasks")
        .select("*")
        .not("due_date", "is", null)
        .gte("due_date", rangeStart)
        .lte("due_date", rangeEnd),
      supabase.from("applications").select("id, company"),
    ]);

  const companyById = new Map(
    (apps ?? []).map((a) => [a.id, a.company as string]),
  );

  const events: CalendarEvent[] = [];
  for (const iv of interviews ?? []) {
    if (!iv.scheduled_at) continue;
    const company = companyById.get(iv.application_id) ?? null;
    events.push({
      id: `iv-${iv.id}`,
      kind: "interview",
      title: company ?? "Interview",
      date: iv.scheduled_at,
      applicationId: iv.application_id,
      company,
      interview: iv,
      task: null,
    });
  }
  for (const t of tasks ?? []) {
    if (!t.due_date) continue;
    const company = t.application_id
      ? (companyById.get(t.application_id) ?? null)
      : null;
    events.push({
      id: `task-${t.id}`,
      kind: "task",
      title: t.title,
      date: t.due_date,
      applicationId: t.application_id,
      company,
      interview: null,
      task: t,
    });
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function getAnalytics(
  filters: AnalyticsFilters,
): Promise<AnalyticsData> {
  if (IS_DEMO) {
    const { apps, history } = demoGetAnalyticsRaw();
    return computeAnalytics(apps, history, filters);
  }

  const { supabase } = await requireUserId();
  const [{ data: apps }, { data: history }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, track, source, date_applied, status"),
    supabase
      .from("status_history")
      .select("application_id, to_status, changed_at"),
  ]);

  return computeAnalytics(
    (apps ?? []) as AppRow[],
    (history ?? []) as HistoryRow[],
    filters,
  );
}

export async function getReminders(): Promise<Nudge[]> {
  if (IS_DEMO) {
    const raw = demoGetReminderRaw();
    return computeReminders(raw);
  }

  const { supabase } = await requireUserId();
  const [{ data: apps }, { data: history }, { data: interviews }, { data: tasks }] =
    await Promise.all([
      supabase.from("applications").select("id, company, status, date_applied"),
      supabase.from("status_history").select("application_id, changed_at"),
      supabase.from("interviews").select("application_id, scheduled_at"),
      supabase
        .from("tasks")
        .select("id, title, status, due_date, application_id"),
    ]);

  return computeReminders({
    apps: apps ?? [],
    history: history ?? [],
    interviews: interviews ?? [],
    tasks: tasks ?? [],
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (IS_DEMO) return demoGetDashboardStats();
  const { supabase } = await requireUserId();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const inThreeDays = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [{ data: apps }, { data: history }, { data: dueTasks }] =
    await Promise.all([
      supabase.from("applications").select("status, date_applied"),
      supabase.from("status_history").select("application_id, to_status"),
      supabase
        .from("tasks")
        .select("id")
        .eq("status", "todo")
        .not("due_date", "is", null)
        .lte("due_date", inThreeDays),
    ]);

  const active = (apps ?? []).filter((a) => a.status !== "closed").length;
  const appliedThisWeek = (apps ?? []).filter(
    (a) => a.date_applied && a.date_applied >= weekAgo,
  ).length;

  // Response rate uses the immutable history: an application "reached applied"
  // if any logged status is applied-or-beyond, and "responded" if any logged
  // status is screening-or-beyond.
  const reachedApplied = new Set<string>();
  const responded = new Set<string>();
  for (const h of history ?? []) {
    const s = h.to_status as Status;
    if (APPLIED_OR_BEYOND.includes(s)) reachedApplied.add(h.application_id);
    if (RESPONDED_STATUSES.includes(s)) responded.add(h.application_id);
  }

  const appliedCount = reachedApplied.size;
  const respondedCount = responded.size;
  const responseRate = appliedCount === 0 ? null : respondedCount / appliedCount;

  return {
    active,
    responseRate,
    respondedCount,
    appliedCount,
    appliedThisWeek,
    tasksDueSoon: (dueTasks ?? []).length,
  };
}
