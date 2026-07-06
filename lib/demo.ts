// Demo mode.
//
// Lets you explore the full interface without a Supabase project. It activates
// automatically while NEXT_PUBLIC_SUPABASE_URL is missing or a placeholder, and
// switches off the moment you drop in real credentials. Data lives in an
// in-memory store (per dev-server process) seeded with sample content, so add /
// edit / drag / complete all work — they just reset when the server restarts.

import { randomUUID } from "crypto";
import type {
  Application,
  StatusHistory,
  Task,
  Interview,
  Document,
  ApplicationDocument,
  PrepNote,
  Contact,
} from "@/lib/database.types";
import type {
  ApplicationWithSignals,
  ApplicationDetail,
  TaskWithApplication,
  DashboardStats,
} from "@/lib/queries";
import type {
  ApplicationFormValues,
  TaskFormValues,
  InterviewFormValues,
  DocumentFormValues,
  PrepNoteFormValues,
  ContactFormValues,
} from "@/lib/schemas";
import { APPLIED_OR_BEYOND, RESPONDED_STATUSES, type Status } from "@/lib/constants";
import { IS_DEMO } from "@/lib/is-demo";

export { IS_DEMO };

const DEMO_USER = "demo-user";

// ---- time helpers ----
const now = () => Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (n: number) => iso(now() - n * 86_400_000);
const daysFromNow = (n: number) => iso(now() + n * 86_400_000);

type DemoState = {
  applications: Application[];
  tasks: Task[];
  history: StatusHistory[];
  interviews: Interview[];
  documents: Document[];
  appDocuments: ApplicationDocument[];
  prepNotes: PrepNote[];
  contacts: Contact[];
};

// ---- seed ----
function makeApp(
  id: string,
  fields: Partial<Application> & Pick<Application, "company" | "role_title">,
): Application {
  return {
    id,
    user_id: DEMO_USER,
    company: fields.company,
    role_title: fields.role_title,
    job_url: fields.job_url ?? null,
    source: fields.source ?? null,
    location: fields.location ?? null,
    work_mode: fields.work_mode ?? null,
    salary_min: fields.salary_min ?? null,
    salary_max: fields.salary_max ?? null,
    salary_currency: fields.salary_currency ?? "PHP",
    status: fields.status ?? "saved",
    close_reason: fields.close_reason ?? null,
    track: fields.track ?? null,
    priority: fields.priority ?? "medium",
    date_saved: fields.date_saved ?? daysAgo(2),
    date_applied: fields.date_applied ?? null,
    notes: fields.notes ?? null,
    created_at: fields.created_at ?? daysAgo(2),
    updated_at: fields.updated_at ?? daysAgo(1),
  };
}

// Build the walked status chain for an application's history.
function chainFor(status: Status): Status[] {
  switch (status) {
    case "saved":
      return ["saved"];
    case "applied":
      return ["saved", "applied"];
    case "screening":
      return ["saved", "applied", "screening"];
    case "interview":
      return ["saved", "applied", "screening", "interview"];
    case "offer":
      return ["saved", "applied", "screening", "interview", "offer"];
    case "closed":
      return ["saved", "applied", "closed"];
    default:
      return ["saved"];
  }
}

function historyFor(app: Application, baseMs: number): StatusHistory[] {
  const chain = chainFor(app.status as Status);
  return chain.map((to, i) => ({
    id: randomUUID(),
    user_id: DEMO_USER,
    application_id: app.id,
    from_status: i === 0 ? null : chain[i - 1],
    to_status: to,
    changed_at: iso(baseMs + i * 3_600_000),
  }));
}

function seed(): DemoState {
  const apps: Application[] = [
    makeApp("demo-a1", {
      company: "Kumu",
      role_title: "Frontend Engineer",
      track: "dev",
      source: "LinkedIn",
      location: "Makati City",
      work_mode: "Remote",
      salary_min: 70000,
      salary_max: 95000,
      priority: "high",
      status: "saved",
      job_url: "https://example.com/jobs/kumu-fe",
      notes: "Referred by a former colleague. React + TypeScript stack.",
      created_at: daysAgo(2),
      date_saved: daysAgo(2),
    }),
    makeApp("demo-a2", {
      company: "Thinking Machines",
      role_title: "Machine Learning Engineer",
      track: "ai",
      source: "Company site",
      location: "BGC, Taguig",
      work_mode: "Hybrid",
      salary_min: 90000,
      salary_max: 130000,
      priority: "high",
      status: "saved",
      notes: "Dream role. Brush up on MLOps before applying.",
      created_at: daysAgo(1),
      date_saved: daysAgo(1),
    }),
    makeApp("demo-a3", {
      company: "Sprout Solutions",
      role_title: "QA Engineer",
      track: "qa",
      source: "JobStreet",
      location: "Pasig City",
      work_mode: "Onsite",
      salary_min: 45000,
      salary_max: 60000,
      status: "applied",
      date_applied: daysAgo(5),
      created_at: daysAgo(6),
      date_saved: daysAgo(6),
    }),
    makeApp("demo-a4", {
      company: "UnionBank",
      role_title: "Data Analyst",
      track: "data",
      source: "LinkedIn",
      location: "Ortigas, Pasig",
      work_mode: "Hybrid",
      salary_min: 55000,
      salary_max: 75000,
      status: "applied",
      date_applied: daysAgo(3),
      created_at: daysAgo(4),
      date_saved: daysAgo(4),
    }),
    makeApp("demo-a5", {
      company: "PayMongo",
      role_title: "Backend Developer",
      track: "dev",
      source: "Referral",
      location: "Remote",
      work_mode: "Remote",
      salary_min: 80000,
      salary_max: 110000,
      priority: "high",
      status: "screening",
      date_applied: daysAgo(8),
      created_at: daysAgo(9),
      date_saved: daysAgo(9),
    }),
    makeApp("demo-a6", {
      company: "Kroll",
      role_title: "QA Automation Engineer",
      track: "qa",
      source: "JobStreet",
      location: "Manila",
      work_mode: "Hybrid",
      salary_min: 60000,
      salary_max: 85000,
      priority: "high",
      status: "interview",
      date_applied: daysAgo(14),
      created_at: daysAgo(15),
      date_saved: daysAgo(15),
    }),
    makeApp("demo-a7", {
      company: "Globe Telecom",
      role_title: "Data Engineer",
      track: "data",
      source: "Company site",
      location: "BGC, Taguig",
      work_mode: "Hybrid",
      salary_min: 95000,
      salary_max: 120000,
      priority: "high",
      status: "offer",
      date_applied: daysAgo(24),
      created_at: daysAgo(25),
      date_saved: daysAgo(25),
    }),
    makeApp("demo-a8", {
      company: "Cognizant",
      role_title: "AI Engineer",
      track: "ai",
      source: "LinkedIn",
      location: "Cebu City",
      work_mode: "Onsite",
      salary_min: 65000,
      salary_max: 90000,
      priority: "low",
      status: "closed",
      close_reason: "rejected",
      date_applied: daysAgo(18),
      created_at: daysAgo(20),
      date_saved: daysAgo(20),
    }),
  ];

  const history: StatusHistory[] = [];
  apps.forEach((app, idx) => {
    const base = now() - (25 - idx) * 86_400_000;
    history.push(...historyFor(app, base));
  });

  const tasks: Task[] = [
    mkTask("demo-a4", "Finish UnionBank take-home", "SQL assessment — due end of week.", daysFromNow(2), "high"),
    mkTask("demo-a6", "Prep for Kroll 2nd interview", "Review Playwright fixtures and CI setup.", daysFromNow(1), "high"),
    mkTask("demo-a3", "Follow up with Sprout recruiter", "It's been a few days since applying.", daysAgo(1), "medium"),
    mkTask("demo-a7", "Respond to Globe offer", "Ask about signing bonus and start date.", daysFromNow(0), "high"),
    mkTask("demo-a2", "Complete an MLOps course module", "Two chapters before applying to TM.", daysFromNow(10), "medium"),
    mkTask(null, "Update resume with latest project", "Add the analytics dashboard work.", null, "medium"),
    mkTask(null, "Refresh LinkedIn headline", null, daysAgo(3), "low", "done"),
  ];

  const interviews: Interview[] = [
    {
      id: "demo-iv1",
      user_id: DEMO_USER,
      application_id: "demo-a6", // Kroll — upcoming technical
      type: "technical",
      scheduled_at: daysFromNow(3),
      location: "https://meet.google.com/demo-kroll",
      notes: "Playwright + CI deep dive. Panel of two.",
      outcome: "pending",
      created_at: daysAgo(2),
    },
    {
      id: "demo-iv2",
      user_id: DEMO_USER,
      application_id: "demo-a5", // PayMongo — phone screen soon
      type: "phone",
      scheduled_at: daysFromNow(1),
      location: "Recruiter will call",
      notes: null,
      outcome: "pending",
      created_at: daysAgo(1),
    },
    {
      id: "demo-iv3",
      user_id: DEMO_USER,
      application_id: "demo-a7", // Globe — final, passed
      type: "final",
      scheduled_at: daysAgo(6),
      location: "BGC office, 12F",
      notes: "Went well — expecting an offer.",
      outcome: "passed",
      created_at: daysAgo(10),
    },
  ];

  const documents: Document[] = [
    {
      id: "demo-doc1",
      user_id: DEMO_USER,
      name: "Kate Martinez — Resume",
      type: "resume",
      version_label: "v3 — QA-focused",
      file_url: "demo/resume-qa.pdf",
      is_default: true,
      created_at: daysAgo(12),
    },
    {
      id: "demo-doc2",
      user_id: DEMO_USER,
      name: "Kate Martinez — Resume",
      type: "resume",
      version_label: "v2 — Dev-focused",
      file_url: "demo/resume-dev.pdf",
      is_default: false,
      created_at: daysAgo(30),
    },
    {
      id: "demo-doc3",
      user_id: DEMO_USER,
      name: "Cover Letter — General",
      type: "cover_letter",
      version_label: "General",
      file_url: "demo/cover-letter.docx",
      is_default: true,
      created_at: daysAgo(20),
    },
  ];

  const appDocuments: ApplicationDocument[] = [
    { application_id: "demo-a6", document_id: "demo-doc1", user_id: DEMO_USER },
    { application_id: "demo-a5", document_id: "demo-doc2", user_id: DEMO_USER },
    { application_id: "demo-a6", document_id: "demo-doc3", user_id: DEMO_USER },
  ];

  const prepNotes: PrepNote[] = [
    {
      id: "demo-prep1",
      user_id: DEMO_USER,
      application_id: "demo-a6", // Kroll research
      category: "research",
      title: "Kroll — company research",
      content:
        "Risk & financial advisory firm.\nQA team owns Cypress + Playwright suites.\nAsk about test flakiness strategy and CI runtime.",
      created_at: daysAgo(4),
      updated_at: daysAgo(2),
    },
    {
      id: "demo-prep2",
      user_id: DEMO_USER,
      application_id: null,
      category: "questions",
      title: "Questions to ask them",
      content:
        "- What does success look like in the first 90 days?\n- How is QA involved in the release process?\n- What's the biggest quality challenge right now?",
      created_at: daysAgo(15),
      updated_at: daysAgo(15),
    },
    {
      id: "demo-prep3",
      user_id: DEMO_USER,
      application_id: null,
      category: "star",
      title: "STAR — caught a critical regression pre-release",
      content:
        "Situation: Release candidate for a payments feature.\nTask: Final QA sign-off in 2 days.\nAction: Wrote an end-to-end Playwright suite covering edge cases.\nResult: Caught a rounding bug that would've mischarged users; blocked the release and got it fixed.",
      created_at: daysAgo(20),
      updated_at: daysAgo(10),
    },
  ];

  const contacts: Contact[] = [
    {
      id: "demo-c1",
      user_id: DEMO_USER,
      application_id: "demo-a6", // Kroll
      name: "Maria Santos",
      role: "Technical Recruiter",
      company: "Kroll",
      email: "maria.santos@example.com",
      linkedin: "https://linkedin.com/in/maria-santos",
      notes: "Responsive; scheduled the technical round quickly.",
      created_at: daysAgo(10),
    },
    {
      id: "demo-c2",
      user_id: DEMO_USER,
      application_id: "demo-a5", // PayMongo
      name: "Josh Reyes",
      role: "Engineering Manager",
      company: "PayMongo",
      email: "josh@example.com",
      linkedin: null,
      notes: "Former colleague who referred me.",
      created_at: daysAgo(9),
    },
    {
      id: "demo-c3",
      user_id: DEMO_USER,
      application_id: null,
      name: "Anna Cruz",
      role: "Talent Partner",
      company: "Globe Telecom",
      email: "anna.cruz@example.com",
      linkedin: "https://linkedin.com/in/anna-cruz",
      notes: "Met at a meetup — good general contact.",
      created_at: daysAgo(30),
    },
  ];

  return {
    applications: apps,
    tasks,
    history,
    interviews,
    documents,
    appDocuments,
    prepNotes,
    contacts,
  };
}

function mkTask(
  applicationId: string | null,
  title: string,
  description: string | null,
  due: string | null,
  priority: string,
  status: string = "todo",
): Task {
  return {
    id: randomUUID(),
    user_id: DEMO_USER,
    application_id: applicationId,
    title,
    description,
    due_date: due,
    status,
    priority,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  };
}

// ---- singleton store (survives HMR in dev) ----
const g = globalThis as unknown as { __huntfolioDemo?: DemoState };
function store(): DemoState {
  const s = g.__huntfolioDemo;
  // Re-seed if missing or if the shape predates a newer field (dev HMR safety).
  if (
    !s ||
    !s.interviews ||
    !s.documents ||
    !s.appDocuments ||
    !s.prepNotes ||
    !s.contacts
  ) {
    g.__huntfolioDemo = seed();
  }
  return g.__huntfolioDemo!;
}

// ---- reads ----
export function demoGetApplicationsWithSignals(): ApplicationWithSignals[] {
  const s = store();
  const nextTask = new Map<string, string>();
  const openWithDue = s.tasks
    .filter((t) => t.status === "todo" && t.due_date && t.application_id)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
  for (const t of openWithDue) {
    if (!nextTask.has(t.application_id!)) nextTask.set(t.application_id!, t.due_date!);
  }

  const nowIso = iso(now());
  const nextInterview = new Map<string, string>();
  const upcoming = s.interviews
    .filter((iv) => iv.scheduled_at && iv.scheduled_at >= nowIso)
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1));
  for (const iv of upcoming) {
    if (!nextInterview.has(iv.application_id))
      nextInterview.set(iv.application_id, iv.scheduled_at!);
  }

  return [...s.applications]
    .sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1))
    .map((a) => ({
      ...a,
      nextTaskDue: nextTask.get(a.id) ?? null,
      nextInterviewAt: nextInterview.get(a.id) ?? null,
    }));
}

export function demoGetApplications(): Application[] {
  return [...store().applications].sort((a, b) =>
    a.created_at! < b.created_at! ? 1 : -1,
  );
}

export function demoGetApplicationDetail(id: string): ApplicationDetail | null {
  const s = store();
  const application = s.applications.find((a) => a.id === id);
  if (!application) return null;
  const tasks = s.tasks
    .filter((t) => t.application_id === id)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "todo" ? -1 : 1));
  const history = s.history
    .filter((h) => h.application_id === id)
    .sort((a, b) => (a.changed_at! < b.changed_at! ? -1 : 1));
  const interviews = s.interviews
    .filter((iv) => iv.application_id === id)
    .sort((a, b) => {
      if (!a.scheduled_at && !b.scheduled_at) return 0;
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return a.scheduled_at < b.scheduled_at ? -1 : 1;
    });
  const docIds = new Set(
    s.appDocuments.filter((ad) => ad.application_id === id).map((ad) => ad.document_id),
  );
  const attachedDocuments = s.documents.filter((d) => docIds.has(d.id));
  return { application, tasks, history, interviews, attachedDocuments };
}

export function demoGetCalendarEvents(rangeStart: string, rangeEnd: string) {
  const s = store();
  const companyById = new Map(s.applications.map((a) => [a.id, a.company]));
  type Ev = {
    id: string;
    kind: "interview" | "task";
    title: string;
    date: string;
    applicationId: string | null;
    company: string | null;
    interview: Interview | null;
    task: Task | null;
  };
  const events: Ev[] = [];

  for (const iv of s.interviews) {
    if (!iv.scheduled_at) continue;
    if (iv.scheduled_at < rangeStart || iv.scheduled_at > rangeEnd) continue;
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
  for (const t of s.tasks) {
    if (!t.due_date) continue;
    if (t.due_date < rangeStart || t.due_date > rangeEnd) continue;
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

// Raw rows for the reminders compute.
export function demoGetReminderRaw() {
  const s = store();
  return {
    apps: s.applications.map((a) => ({
      id: a.id,
      company: a.company,
      status: a.status,
      date_applied: a.date_applied,
    })),
    history: s.history.map((h) => ({
      application_id: h.application_id,
      changed_at: h.changed_at,
    })),
    interviews: s.interviews.map((iv) => ({
      application_id: iv.application_id,
      scheduled_at: iv.scheduled_at,
    })),
    tasks: s.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      due_date: t.due_date,
      application_id: t.application_id,
    })),
  };
}

// Raw rows for the analytics compute (the pure helper does the filtering/math).
export function demoGetAnalyticsRaw() {
  const s = store();
  return {
    apps: s.applications.map((a) => ({
      id: a.id,
      track: a.track,
      source: a.source,
      date_applied: a.date_applied,
      status: a.status,
    })),
    history: s.history.map((h) => ({
      application_id: h.application_id,
      to_status: h.to_status,
      changed_at: h.changed_at,
    })),
  };
}

export function demoGetDocuments(): Document[] {
  return [...store().documents].sort((a, b) => {
    if (a.type !== b.type) return (a.type ?? "") < (b.type ?? "") ? -1 : 1;
    return (a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1;
  });
}

export function demoGetTasks(): TaskWithApplication[] {
  const s = store();
  return [...s.tasks]
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    })
    .map((t) => {
      const app = t.application_id
        ? s.applications.find((a) => a.id === t.application_id)
        : null;
      return {
        ...t,
        application: app ? { id: app.id, company: app.company } : null,
      };
    });
}

export function demoGetDashboardStats(): DashboardStats {
  const s = store();
  const weekAgo = daysAgo(7);
  const inThree = daysFromNow(3);

  const active = s.applications.filter((a) => a.status !== "closed").length;
  const appliedThisWeek = s.applications.filter(
    (a) => a.date_applied && a.date_applied >= weekAgo,
  ).length;

  const reachedApplied = new Set<string>();
  const responded = new Set<string>();
  for (const h of s.history) {
    const st = h.to_status as Status;
    if (APPLIED_OR_BEYOND.includes(st)) reachedApplied.add(h.application_id);
    if (RESPONDED_STATUSES.includes(st)) responded.add(h.application_id);
  }
  const appliedCount = reachedApplied.size;
  const respondedCount = responded.size;

  const tasksDueSoon = s.tasks.filter(
    (t) => t.status === "todo" && t.due_date && t.due_date <= inThree,
  ).length;

  return {
    active,
    responseRate: appliedCount === 0 ? null : respondedCount / appliedCount,
    respondedCount,
    appliedCount,
    appliedThisWeek,
    tasksDueSoon,
  };
}

// ---- application mutations ----
function nullify(v: string | undefined | null): string | null {
  return v === undefined || v === null || v === "" ? null : v;
}

function applyFields(target: Application, values: ApplicationFormValues) {
  target.company = values.company!;
  target.role_title = values.role_title!;
  target.job_url = nullify(values.job_url);
  target.source = nullify(values.source);
  target.location = nullify(values.location);
  target.work_mode = nullify(values.work_mode);
  target.salary_min = values.salary_min == null || values.salary_min === ("" as unknown) ? null : Number(values.salary_min);
  target.salary_max = values.salary_max == null || values.salary_max === ("" as unknown) ? null : Number(values.salary_max);
  target.salary_currency = values.salary_currency || "PHP";
  target.track = nullify(values.track);
  target.priority = values.priority ?? "medium";
  target.date_applied = nullify(values.date_applied);
  target.notes = nullify(values.notes);
  target.close_reason =
    values.status === "closed" ? nullify(values.close_reason) : null;
}

function logHistory(appId: string, from: string | null, to: string) {
  store().history.push({
    id: randomUUID(),
    user_id: DEMO_USER,
    application_id: appId,
    from_status: from,
    to_status: to,
    changed_at: iso(now()),
  });
}

export function demoCreateApplication(values: ApplicationFormValues): { id: string } {
  const s = store();
  const id = randomUUID();
  const app = makeApp(id, {
    company: values.company!,
    role_title: values.role_title!,
    created_at: iso(now()),
    date_saved: iso(now()),
  });
  applyFields(app, values);
  const status = (values.status ?? "saved") as Status;
  app.status = status;
  if (!app.date_applied && APPLIED_OR_BEYOND.includes(status)) {
    app.date_applied = iso(now());
  }
  s.applications.push(app);
  logHistory(id, null, status);
  return { id };
}

export function demoUpdateApplication(id: string, values: ApplicationFormValues) {
  const s = store();
  const app = s.applications.find((a) => a.id === id);
  if (!app) return;
  const prevStatus = app.status;
  applyFields(app, values);
  const status = (values.status ?? app.status) as Status;
  app.status = status;
  if (!app.date_applied && APPLIED_OR_BEYOND.includes(status)) {
    app.date_applied = iso(now());
  }
  app.updated_at = iso(now());
  if (prevStatus !== status) logHistory(id, prevStatus, status);
}

export function demoDeleteApplication(id: string) {
  const s = store();
  s.applications = s.applications.filter((a) => a.id !== id);
  s.tasks = s.tasks.filter((t) => t.application_id !== id);
  s.history = s.history.filter((h) => h.application_id !== id);
}

export function demoUpdateApplicationStatus(
  id: string,
  status: Status,
  closeReason?: string | null,
) {
  const s = store();
  const app = s.applications.find((a) => a.id === id);
  if (!app) return;
  const prev = app.status;
  if (prev === status) return;
  app.status = status;
  app.close_reason = status === "closed" ? (closeReason ?? null) : null;
  if (!app.date_applied && APPLIED_OR_BEYOND.includes(status)) {
    app.date_applied = iso(now());
  }
  app.updated_at = iso(now());
  logHistory(id, prev, status);
}

// ---- task mutations ----
export function demoCreateTask(values: TaskFormValues): { id: string } {
  const id = randomUUID();
  store().tasks.push({
    id,
    user_id: DEMO_USER,
    application_id: values.application_id ? values.application_id : null,
    title: values.title!,
    description: values.description || null,
    due_date: values.due_date || null,
    status: "todo",
    priority: values.priority ?? "medium",
    created_at: iso(now()),
    updated_at: iso(now()),
  });
  return { id };
}

export function demoToggleTask(id: string, done: boolean) {
  const t = store().tasks.find((x) => x.id === id);
  if (t) {
    t.status = done ? "done" : "todo";
    t.updated_at = iso(now());
  }
}

export function demoDeleteTask(id: string) {
  const s = store();
  s.tasks = s.tasks.filter((t) => t.id !== id);
}

// ---- interview mutations ----
export function demoCreateInterview(values: InterviewFormValues): { id: string } {
  const id = randomUUID();
  store().interviews.push({
    id,
    user_id: DEMO_USER,
    application_id: values.application_id!,
    type: values.type || null,
    scheduled_at: values.scheduled_at || null,
    location: values.location || null,
    notes: values.notes || null,
    outcome: values.outcome ?? "pending",
    created_at: iso(now()),
  });
  return { id };
}

export function demoUpdateInterview(id: string, values: InterviewFormValues) {
  const iv = store().interviews.find((x) => x.id === id);
  if (!iv) return;
  iv.type = values.type || null;
  iv.scheduled_at = values.scheduled_at || null;
  iv.location = values.location || null;
  iv.notes = values.notes || null;
  iv.outcome = values.outcome ?? "pending";
}

export function demoDeleteInterview(id: string) {
  const s = store();
  s.interviews = s.interviews.filter((iv) => iv.id !== id);
}

// ---- document mutations ----
export function demoCreateDocument(
  values: DocumentFormValues,
  id?: string,
): { id: string } {
  const s = store();
  const type = values.type ?? "other";
  if (values.is_default) {
    // Clear any existing default of the same type.
    s.documents.forEach((d) => {
      if (d.type === type) d.is_default = false;
    });
  }
  const docId = id ?? randomUUID();
  s.documents.push({
    id: docId,
    user_id: DEMO_USER,
    name: values.name!,
    type,
    version_label: values.version_label || null,
    file_url: values.file_url!,
    is_default: values.is_default ?? false,
    created_at: iso(now()),
  });
  return { id: docId };
}

export function demoSetDefaultDocument(id: string) {
  const s = store();
  const doc = s.documents.find((d) => d.id === id);
  if (!doc) return;
  s.documents.forEach((d) => {
    if (d.type === doc.type) d.is_default = d.id === id;
  });
}

export function demoDeleteDocument(id: string) {
  const s = store();
  s.documents = s.documents.filter((d) => d.id !== id);
  s.appDocuments = s.appDocuments.filter((ad) => ad.document_id !== id);
}

export function demoAttachDocument(applicationId: string, documentId: string) {
  const s = store();
  const exists = s.appDocuments.some(
    (ad) => ad.application_id === applicationId && ad.document_id === documentId,
  );
  if (!exists) {
    s.appDocuments.push({
      application_id: applicationId,
      document_id: documentId,
      user_id: DEMO_USER,
    });
  }
}

export function demoDetachDocument(applicationId: string, documentId: string) {
  const s = store();
  s.appDocuments = s.appDocuments.filter(
    (ad) =>
      !(ad.application_id === applicationId && ad.document_id === documentId),
  );
}

// ---- prep-note reads ----
export function demoGetPrepNotes() {
  const s = store();
  const companyById = new Map(s.applications.map((a) => [a.id, a.company]));
  return [...s.prepNotes]
    .sort((a, b) => ((a.updated_at ?? "") < (b.updated_at ?? "") ? 1 : -1))
    .map((n) => ({
      ...n,
      application: n.application_id
        ? {
            id: n.application_id,
            company: companyById.get(n.application_id) ?? "",
          }
        : null,
    }));
}

export function demoGetApplicationPrep(applicationId: string) {
  const s = store();
  const research = s.prepNotes
    .filter((n) => n.category === "research" && n.application_id === applicationId)
    .sort((a, b) => ((a.updated_at ?? "") < (b.updated_at ?? "") ? 1 : -1));
  const star = s.prepNotes
    .filter((n) => n.category === "star")
    .sort((a, b) => ((a.updated_at ?? "") < (b.updated_at ?? "") ? 1 : -1));
  return { research, star };
}

// ---- prep-note mutations ----
export function demoCreatePrepNote(values: PrepNoteFormValues): { id: string } {
  const id = randomUUID();
  store().prepNotes.push({
    id,
    user_id: DEMO_USER,
    application_id: values.application_id ? values.application_id : null,
    category: values.category!,
    title: values.title!,
    content: values.content || null,
    created_at: iso(now()),
    updated_at: iso(now()),
  });
  return { id };
}

export function demoUpdatePrepNote(id: string, values: PrepNoteFormValues) {
  const n = store().prepNotes.find((x) => x.id === id);
  if (!n) return;
  n.title = values.title!;
  n.content = values.content || null;
  n.category = values.category ?? n.category;
  n.application_id = values.application_id ? values.application_id : null;
  n.updated_at = iso(now());
}

export function demoDeletePrepNote(id: string) {
  const s = store();
  s.prepNotes = s.prepNotes.filter((n) => n.id !== id);
}

// ---- contact reads ----
export function demoGetContacts() {
  const s = store();
  const companyById = new Map(s.applications.map((a) => [a.id, a.company]));
  return [...s.contacts]
    .sort((a, b) => ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1))
    .map((c) => ({
      ...c,
      application: c.application_id
        ? {
            id: c.application_id,
            company: companyById.get(c.application_id) ?? "",
          }
        : null,
    }));
}

export function demoGetContactsForApplication(applicationId: string): Contact[] {
  return store()
    .contacts.filter((c) => c.application_id === applicationId)
    .sort((a, b) => ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1));
}

// ---- contact mutations ----
export function demoCreateContact(values: ContactFormValues): { id: string } {
  const id = randomUUID();
  store().contacts.push({
    id,
    user_id: DEMO_USER,
    application_id: values.application_id ? values.application_id : null,
    name: values.name!,
    role: values.role || null,
    company: values.company || null,
    email: values.email || null,
    linkedin: values.linkedin || null,
    notes: values.notes || null,
    created_at: iso(now()),
  });
  return { id };
}

export function demoUpdateContact(id: string, values: ContactFormValues) {
  const c = store().contacts.find((x) => x.id === id);
  if (!c) return;
  c.name = values.name!;
  c.role = values.role || null;
  c.company = values.company || null;
  c.email = values.email || null;
  c.linkedin = values.linkedin || null;
  c.notes = values.notes || null;
  c.application_id = values.application_id ? values.application_id : null;
}

export function demoDeleteContact(id: string) {
  const s = store();
  s.contacts = s.contacts.filter((c) => c.id !== id);
}
