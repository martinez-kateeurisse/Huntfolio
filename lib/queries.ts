import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import {
  APPLIED_OR_BEYOND,
  INACTIVE_STATUSES,
  NO_RESPONSE_AFTER_DAYS,
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
  InboxEvent,
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
  demoSweepNoResponse,
} from "@/lib/demo";
import {
  computeAnalytics,
  type AnalyticsData,
  type AnalyticsFilters,
  type AppRow,
  type HistoryRow,
  type SignalRow,
} from "@/lib/analytics";
import { computeReminders, type Nudge } from "@/lib/reminders";
import { applyInboxEvents } from "@/lib/inbox/apply";

// A board card needs the application plus one contextual signal.
export type ApplicationWithSignals = Application & {
  nextTaskDue: string | null;
  nextInterviewAt: string | null;
  nextInterviewRound: number | null;
  viewedAt: string | null; // latest "employer viewed your application" email
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
  total: number;
};

async function requireUserId() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

// Supabase reports failures in `error` instead of throwing. Raise them so the
// route's error boundary shows a real message, rather than rendering an empty
// page that looks like the data is gone.
function assertOk(...results: { error: { message: string } | null }[]) {
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

// Applications left in "Applied" with no activity for NO_RESPONSE_AFTER_DAYS
// move to "No response" on their own. This runs lazily before the reads that
// show statuses (no background job needed), at most hourly per user per
// server instance. The update is idempotent, so a skipped or repeated run is
// harmless. Moving a card back to Applied bumps updated_at, resetting the clock.
const SWEEP_EVERY_MS = 60 * 60 * 1000;
const lastSweepAt = new Map<string, number>();

const sweepNoResponse = cache(async () => {
  if (IS_DEMO) return demoSweepNoResponse();
  const { supabase, userId } = await requireUserId();
  if (Date.now() - (lastSweepAt.get(userId) ?? 0) < SWEEP_EVERY_MS) return;
  lastSweepAt.set(userId, Date.now());

  const cutoff = new Date(
    Date.now() - NO_RESPONSE_AFTER_DAYS * 86_400_000,
  ).toISOString();
  const { error } = await supabase
    .from("applications")
    .update({ status: "no_response" })
    .eq("status", "applied")
    .lt("date_applied", cutoff)
    .lt("updated_at", cutoff);
  // Not worth failing the page over; the next visit retries.
  if (error) {
    lastSweepAt.delete(userId);
    console.error("No-response sweep failed:", error.message);
  }
});

// Emails reported by the Gmail script are applied in small batches before
// pages render, so a normal load only pays for one quick "anything new?"
// check, at most every couple of minutes. A backlog (e.g. the first 30-day
// import) keeps draining on each load, or all at once via "Add now".
const INBOX_BATCH = 8;
const INBOX_CHECK_EVERY_MS = 2 * 60 * 1000;
const lastInboxCheckAt = new Map<string, number>();

async function applyInbox() {
  if (IS_DEMO) return;
  const { supabase, userId } = await requireUserId();
  if (Date.now() - (lastInboxCheckAt.get(userId) ?? 0) < INBOX_CHECK_EVERY_MS) {
    return;
  }
  try {
    const { remaining } = await applyInboxEvents(supabase, userId, INBOX_BATCH);
    if (remaining === 0) lastInboxCheckAt.set(userId, Date.now());
  } catch (e) {
    // Most likely the inbox migration hasn't been run yet. Never block a page.
    lastInboxCheckAt.set(userId, Date.now());
    console.error("Inbox sync failed:", e);
  }
}

// Upkeep that must happen before statuses are read: new emails first (an
// interview invite should win over "no response"), then the no-response sweep.
const runAutomations = cache(async () => {
  await applyInbox();
  await sweepNoResponse();
});

export type InboxStatus = {
  available: boolean; // false in demo mode or before the inbox migration
  connected: boolean;
  lastSeenAt: string | null;
  pending: number;
  recent: InboxEvent[];
};

// The Gmail connection and what it recently changed, for the Today page.
export async function getInboxStatus(): Promise<InboxStatus> {
  const unavailable = {
    available: false,
    connected: false,
    lastSeenAt: null,
    pending: 0,
    recent: [],
  };
  if (IS_DEMO) return unavailable;
  await runAutomations();
  const { supabase } = await requireUserId();

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [conn, recent, pending] = await Promise.all([
    supabase.from("inbox_connections").select("last_seen_at").maybeSingle(),
    supabase
      .from("inbox_events")
      .select("*")
      .neq("status", "pending")
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(20),
    supabase
      .from("inbox_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  // Before the inbox migration runs, show the feature as unavailable rather
  // than failing the whole Today page.
  if (conn.error || recent.error || pending.error) return unavailable;

  return {
    available: true,
    connected: Boolean(conn.data),
    lastSeenAt: conn.data?.last_seen_at ?? null,
    pending: pending.count ?? 0,
    // What changed, plus emails it couldn't place (so you can add them by
    // hand) — not the "already up to date" repeats.
    recent: (recent.data ?? [])
      .filter((ev) => ev.status === "done" || !ev.application_id)
      .slice(0, 6),
  };
}

// All applications with their board signals (next task due, next interview).
export async function getApplicationsWithSignals(): Promise<
  ApplicationWithSignals[]
> {
  await runAutomations();
  if (IS_DEMO) return demoGetApplicationsWithSignals();
  const { supabase } = await requireUserId();

  // Gmail sync data is optional (its tables may not exist yet), so it's
  // fetched alongside but never fails the board.
  const viewedPromise = Promise.resolve(
    supabase
      .from("inbox_events")
      .select("application_id, received_at")
      .eq("kind", "viewed")
      .eq("status", "done")
      .order("received_at", { ascending: false }),
  );
  const results = await Promise.all([
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
    // "*" rather than a column list, so the board still loads if the
    // interview-rounds migration hasn't been run yet.
    supabase
      .from("interviews")
      .select("*")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true }),
  ]);
  assertOk(...results);
  const [{ data: apps }, { data: tasks }, { data: interviews }] = results;
  const viewed = await viewedPromise;

  // First seen wins because both lists are sorted ascending by date.
  const nextTask = new Map<string, string>();
  for (const t of tasks ?? []) {
    if (t.application_id && t.due_date && !nextTask.has(t.application_id)) {
      nextTask.set(t.application_id, t.due_date);
    }
  }
  const nextInterview = new Map<string, { at: string; round: number | null }>();
  for (const iv of interviews ?? []) {
    if (
      iv.application_id &&
      iv.scheduled_at &&
      !nextInterview.has(iv.application_id)
    ) {
      nextInterview.set(iv.application_id, {
        at: iv.scheduled_at,
        round: iv.round ?? null,
      });
    }
  }

  // Newest first, so first seen is the latest view.
  const lastViewed = new Map<string, string>();
  for (const v of viewed.error ? [] : (viewed.data ?? [])) {
    if (v.application_id && !lastViewed.has(v.application_id)) {
      lastViewed.set(v.application_id, v.received_at);
    }
  }

  return (apps ?? []).map((a) => ({
    ...a,
    nextTaskDue: nextTask.get(a.id) ?? null,
    nextInterviewAt: nextInterview.get(a.id)?.at ?? null,
    nextInterviewRound: nextInterview.get(a.id)?.round ?? null,
    viewedAt: lastViewed.get(a.id) ?? null,
  }));
}

// Flat list of applications (for the table view).
export async function getApplications(): Promise<Application[]> {
  await runAutomations();
  if (IS_DEMO) return demoGetApplications();
  const { supabase } = await requireUserId();
  const res = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });
  assertOk(res);
  return res.data ?? [];
}

export async function getApplicationDetail(
  id: string,
): Promise<ApplicationDetail | null> {
  await runAutomations();
  if (IS_DEMO) return demoGetApplicationDetail(id);
  const { supabase } = await requireUserId();

  const appRes = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  assertOk(appRes);
  const application = appRes.data;

  if (!application) return null;

  const results = await Promise.all([
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
  assertOk(...results);
  const [
    { data: tasks },
    { data: history },
    { data: interviews },
    { data: attachRows },
  ] = results;

  // Resolve attached documents in a second step (avoids relying on a declared
  // FK relationship in the generated types).
  const docIds = (attachRows ?? []).map((r) => r.document_id);
  let attachedDocuments: Document[] = [];
  if (docIds.length > 0) {
    const docsRes = await supabase
      .from("documents")
      .select("*")
      .in("id", docIds);
    assertOk(docsRes);
    attachedDocuments = docsRes.data ?? [];
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
  const res = await supabase
    .from("tasks")
    .select("*, application:applications(id, company)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  assertOk(res);
  // The FK tasks.application_id -> applications(id) makes this embed work at
  // runtime; our hand-written types don't declare the relation, so cast.
  return (res.data ?? []) as unknown as TaskWithApplication[];
}

export type PrepNoteWithApplication = PrepNote & {
  application: { id: string; company: string } | null;
};

// All prep notes for the user, with the linked application's company (if any).
export async function getPrepNotes(): Promise<PrepNoteWithApplication[]> {
  if (IS_DEMO) return demoGetPrepNotes();
  const { supabase } = await requireUserId();
  const res = await supabase
    .from("prep_notes")
    .select("*, application:applications(id, company)")
    .order("updated_at", { ascending: false });
  assertOk(res);
  return (res.data ?? []) as unknown as PrepNoteWithApplication[];
}

// For the application detail: this app's research notes + all reusable STAR
// stories (a handy read-only glance before an interview).
export async function getApplicationPrep(
  applicationId: string,
): Promise<{ research: PrepNote[]; star: PrepNote[] }> {
  if (IS_DEMO) return demoGetApplicationPrep(applicationId);
  const { supabase } = await requireUserId();
  const results = await Promise.all([
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
  assertOk(...results);
  const [{ data: research }, { data: star }] = results;
  return { research: research ?? [], star: star ?? [] };
}

export type ContactWithApplication = Contact & {
  application: { id: string; company: string } | null;
};

export async function getContacts(): Promise<ContactWithApplication[]> {
  if (IS_DEMO) return demoGetContacts();
  const { supabase } = await requireUserId();
  const res = await supabase
    .from("contacts")
    .select("*, application:applications(id, company)")
    .order("created_at", { ascending: false });
  assertOk(res);
  return (res.data ?? []) as unknown as ContactWithApplication[];
}

export async function getContactsForApplication(
  applicationId: string,
): Promise<Contact[]> {
  if (IS_DEMO) return demoGetContactsForApplication(applicationId);
  const { supabase } = await requireUserId();
  const res = await supabase
    .from("contacts")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  assertOk(res);
  return res.data ?? [];
}

export async function getDocuments(): Promise<Document[]> {
  if (IS_DEMO) return demoGetDocuments();
  const { supabase } = await requireUserId();
  const res = await supabase
    .from("documents")
    .select("*")
    .order("type", { ascending: true })
    .order("created_at", { ascending: false });
  assertOk(res);
  return res.data ?? [];
}

// Interviews + dated tasks within [rangeStart, rangeEnd], normalized so the
// calendar has a single clean data source.
export async function getCalendarEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarEvent[]> {
  if (IS_DEMO) return demoGetCalendarEvents(rangeStart, rangeEnd);
  const { supabase } = await requireUserId();

  const results = await Promise.all([
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
  assertOk(...results);
  const [{ data: interviews }, { data: tasks }, { data: apps }] = results;

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
  await runAutomations();
  if (IS_DEMO) {
    const { apps, history } = demoGetAnalyticsRaw();
    return computeAnalytics(apps, history, filters);
  }

  const { supabase } = await requireUserId();
  // Employer activity from Gmail sync feeds Viewed / Heard back. Optional:
  // without the inbox tables those fall back to status history alone.
  const signalsPromise = Promise.resolve(
    supabase
      .from("inbox_events")
      .select("application_id, kind")
      .eq("status", "done")
      .not("application_id", "is", null),
  );
  const results = await Promise.all([
    supabase
      .from("applications")
      .select("id, track, source, date_applied, status, close_reason"),
    supabase
      .from("status_history")
      .select("application_id, to_status, changed_at"),
  ]);
  assertOk(...results);
  const [{ data: apps }, { data: history }] = results;
  const signals = await signalsPromise;

  return computeAnalytics(
    (apps ?? []) as AppRow[],
    (history ?? []) as HistoryRow[],
    filters,
    signals.error ? [] : ((signals.data ?? []) as SignalRow[]),
  );
}

// Emails Gmail sync matched to one application, newest first, for its
// History tab. Empty in demo mode or before the inbox migration.
export async function getApplicationEmails(
  applicationId: string,
): Promise<InboxEvent[]> {
  if (IS_DEMO) return [];
  const { supabase } = await requireUserId();
  const res = await supabase
    .from("inbox_events")
    .select("*")
    .eq("application_id", applicationId)
    .neq("status", "pending")
    .order("received_at", { ascending: false });
  return res.error ? [] : (res.data ?? []);
}

export async function getReminders(): Promise<Nudge[]> {
  await runAutomations();
  if (IS_DEMO) {
    const raw = demoGetReminderRaw();
    return computeReminders(raw);
  }

  const { supabase } = await requireUserId();
  const results = await Promise.all([
    supabase.from("applications").select("id, company, status, date_applied"),
    supabase.from("status_history").select("application_id, changed_at"),
    supabase.from("interviews").select("application_id, scheduled_at"),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, application_id"),
  ]);
  assertOk(...results);
  const [{ data: apps }, { data: history }, { data: interviews }, { data: tasks }] =
    results;

  return computeReminders({
    apps: apps ?? [],
    history: history ?? [],
    interviews: interviews ?? [],
    tasks: tasks ?? [],
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await runAutomations();
  if (IS_DEMO) return demoGetDashboardStats();
  const { supabase } = await requireUserId();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const inThreeDays = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const results = await Promise.all([
    supabase.from("applications").select("status, date_applied"),
    supabase.from("status_history").select("application_id, to_status"),
    supabase
      .from("tasks")
      .select("id")
      .eq("status", "todo")
      .not("due_date", "is", null)
      .lte("due_date", inThreeDays),
  ]);
  assertOk(...results);
  const [{ data: apps }, { data: history }, { data: dueTasks }] = results;

  const active = (apps ?? []).filter(
    (a) => !INACTIVE_STATUSES.includes(a.status as Status),
  ).length;
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
    total: (apps ?? []).length,
  };
}
