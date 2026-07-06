// Pure "needs attention" nudge computation. Takes plain rows (no I/O) so it's
// easy to reason about and test. The home view renders whatever this returns.

export const FOLLOW_UP_DAYS = 7;
export const STALE_DAYS = 14;
export const INTERVIEW_SOON_DAYS = 3;

export type NudgeKind =
  | "interview_soon"
  | "overdue_task"
  | "follow_up"
  | "stale";

export type Nudge = {
  id: string;
  kind: NudgeKind;
  title: string;
  subtitle?: string;
  applicationId: string | null;
  taskId: string | null;
};

export type ReminderApp = {
  id: string;
  company: string;
  status: string;
  date_applied: string | null;
};
export type ReminderHistory = {
  application_id: string;
  changed_at: string | null;
};
export type ReminderInterview = {
  application_id: string;
  scheduled_at: string | null;
};
export type ReminderTask = {
  id: string;
  title: string;
  status: string | null;
  due_date: string | null;
  application_id: string | null;
};

export type ReminderInput = {
  apps: ReminderApp[];
  history: ReminderHistory[];
  interviews: ReminderInterview[];
  tasks: ReminderTask[];
};

const MS_PER_DAY = 86_400_000;

function daysBetween(fromIso: string, toMs: number): number {
  return (toMs - new Date(fromIso).getTime()) / MS_PER_DAY;
}

export function computeReminders(
  input: ReminderInput,
  nowMs: number = Date.now(),
): Nudge[] {
  const { apps, history, interviews, tasks } = input;
  const nudges: Nudge[] = [];
  const companyById = new Map(apps.map((a) => [a.id, a.company]));

  // Apps that have a future interview / an open task (used to suppress noise).
  const nowIso = new Date(nowMs).toISOString();
  const appsWithUpcomingInterview = new Set(
    interviews
      .filter((iv) => iv.scheduled_at && iv.scheduled_at >= nowIso)
      .map((iv) => iv.application_id),
  );
  const appsWithOpenTask = new Set(
    tasks
      .filter((t) => t.status === "todo" && t.application_id)
      .map((t) => t.application_id as string),
  );

  // Latest status change per app.
  const lastChange = new Map<string, string>();
  for (const h of history) {
    if (!h.changed_at) continue;
    const cur = lastChange.get(h.application_id);
    if (!cur || h.changed_at > cur) lastChange.set(h.application_id, h.changed_at);
  }

  // 1. Interview soon (within the next N days).
  for (const iv of interviews) {
    if (!iv.scheduled_at) continue;
    const days = daysBetween(iv.scheduled_at, nowMs);
    // scheduled in the future, within the window
    if (days <= 0 && days >= -INTERVIEW_SOON_DAYS) {
      nudges.push({
        id: `iv-${iv.application_id}-${iv.scheduled_at}`,
        kind: "interview_soon",
        title: `Interview soon — ${companyById.get(iv.application_id) ?? "Application"}`,
        subtitle: relativeFuture(iv.scheduled_at, nowMs),
        applicationId: iv.application_id,
        taskId: null,
      });
    }
  }

  // 2. Overdue tasks.
  for (const t of tasks) {
    if (t.status !== "todo" || !t.due_date) continue;
    if (daysBetween(t.due_date, nowMs) > 0) {
      const company = t.application_id
        ? companyById.get(t.application_id)
        : null;
      nudges.push({
        id: `task-${t.id}`,
        kind: "overdue_task",
        title: t.title,
        subtitle: company ? `${company} · overdue` : "Overdue",
        applicationId: t.application_id,
        taskId: t.id,
      });
    }
  }

  // 3. Follow up: applied > FOLLOW_UP_DAYS, no upcoming interview, no open task.
  const flagged = new Set<string>();
  for (const app of apps) {
    if (app.status !== "applied" || !app.date_applied) continue;
    if (daysBetween(app.date_applied, nowMs) <= FOLLOW_UP_DAYS) continue;
    if (appsWithUpcomingInterview.has(app.id)) continue;
    if (appsWithOpenTask.has(app.id)) continue;
    flagged.add(app.id);
    nudges.push({
      id: `followup-${app.id}`,
      kind: "follow_up",
      title: `Follow up with ${app.company}`,
      subtitle: `Applied ${Math.floor(daysBetween(app.date_applied, nowMs))}d ago, no reply`,
      applicationId: app.id,
      taskId: null,
    });
  }

  // 4. Stale: open app with no status change in > STALE_DAYS (and not already a
  //    follow-up nudge, which is the more actionable signal).
  for (const app of apps) {
    if (app.status === "closed") continue;
    if (flagged.has(app.id)) continue;
    const last = lastChange.get(app.id);
    if (!last) continue;
    if (daysBetween(last, nowMs) > STALE_DAYS) {
      nudges.push({
        id: `stale-${app.id}`,
        kind: "stale",
        title: `${app.company} has gone quiet`,
        subtitle: `No movement in ${Math.floor(daysBetween(last, nowMs))}d`,
        applicationId: app.id,
        taskId: null,
      });
    }
  }

  // Order by urgency.
  const order: Record<NudgeKind, number> = {
    interview_soon: 0,
    overdue_task: 1,
    follow_up: 2,
    stale: 3,
  };
  return nudges.sort((a, b) => order[a.kind] - order[b.kind]);
}

function relativeFuture(iso: string, nowMs: number): string {
  const diff = new Date(iso).getTime() - nowMs;
  const days = Math.round(diff / MS_PER_DAY);
  const hours = Math.round(diff / 3_600_000);
  if (days >= 1) return `in ${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  return "very soon";
}
