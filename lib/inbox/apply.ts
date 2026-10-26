// Applies job emails reported by the Gmail script to the tracker: creates the
// application if it's new, moves its status forward, and adds interviews.
// Runs under the signed-in user's session (RLS applies), either lazily before
// a page renders or from the "Check now" button.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InboxEvent } from "@/lib/database.types";
import { formatDateTime } from "@/lib/format";
import {
  APPLIED_OR_BEYOND,
  STATUS_LABELS,
  type Status,
} from "@/lib/constants";
import type { EmailKind } from "@/lib/inbox/classify";

type Client = SupabaseClient<Database>;
type AppLite = {
  id: string;
  company: string;
  role_title: string;
  status: string;
  date_applied: string | null;
  created_at: string | null;
};

// The status each kind of email implies, at minimum. A view or a message
// proves you applied, but says nothing more about where things stand.
const KIND_STATUS: Record<EmailKind, Status> = {
  applied: "applied",
  viewed: "applied",
  message: "applied",
  screening: "screening",
  interview: "interview",
  offer: "offer",
  rejection: "closed",
};

// How far along each status is. Emails only ever move an application forward
// (an old "thanks for applying" never drags an interview back to Applied).
const STAGE_RANK: Record<string, number> = {
  saved: 0,
  applied: 1,
  no_response: 1,
  screening: 2,
  interview: 3,
  final_interview: 4,
  offer: 5,
  closed: 6,
};

// "Acme Corp., Inc." and "ACME" are the same employer.
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(inc|corp|corporation|co|ltd|llc|plc|limited|philippines|ph|group|holdings|technologies|technology|solutions|the)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findApplication(
  apps: AppLite[],
  company: string,
  role: string | null,
): AppLite | null {
  const key = normalizeCompany(company);
  if (key.length < 2) return null;
  const sameCompany = apps.filter((a) => {
    const k = normalizeCompany(a.company);
    return (
      k === key ||
      (k.length >= 4 && key.length >= 4 && (k.includes(key) || key.includes(k)))
    );
  });
  if (sameCompany.length <= 1) return sameCompany[0] ?? null;

  // Several roles at one company: prefer the matching role, then an open
  // application, then the newest.
  const roleKey = role ? normalizeCompany(role) : "";
  return [...sameCompany].sort((a, b) => {
    const roleA = roleKey && normalizeCompany(a.role_title).includes(roleKey) ? 0 : 1;
    const roleB = roleKey && normalizeCompany(b.role_title).includes(roleKey) ? 0 : 1;
    if (roleA !== roleB) return roleA - roleB;
    const openA = a.status === "closed" ? 1 : 0;
    const openB = b.status === "closed" ? 1 : 0;
    if (openA !== openB) return openA - openB;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  })[0];
}

function sourceFromSender(email: string | null): string | null {
  if (!email) return null;
  if (/linkedin\./i.test(email)) return "LinkedIn";
  if (/jobstreet\./i.test(email)) return "JobStreet";
  return null;
}

type Outcome = {
  status: "done" | "skipped";
  applicationId: string | null;
  result: string;
};

async function applyEvent(
  supabase: Client,
  userId: string,
  ev: InboxEvent,
  apps: AppLite[],
): Promise<Outcome> {
  // A final-round invite goes straight to the Final interview column.
  const target =
    ev.kind === "interview" && ev.interview_type === "final"
      ? "final_interview"
      : KIND_STATUS[ev.kind as EmailKind];
  if (!target) {
    return { status: "skipped", applicationId: null, result: "Not something to track" };
  }
  if (!ev.company) {
    return {
      status: "skipped",
      applicationId: null,
      result: "Couldn't tell which company this is from",
    };
  }

  const notes: string[] = [];
  let app = findApplication(apps, ev.company, ev.role_title);

  if (!app) {
    const { data, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        company: ev.company,
        role_title: ev.role_title ?? "Role from email",
        status: target,
        close_reason: target === "closed" ? "rejected" : null,
        date_applied: APPLIED_OR_BEYOND.includes(target) ? ev.received_at : null,
        source: sourceFromSender(ev.from_email),
        notes: `Added from email: "${ev.subject ?? ""}"`,
      })
      .select("id, company, role_title, status, date_applied, created_at")
      .single();
    if (error) throw new Error(error.message);
    app = data;
    apps.push(data);
    notes.push(`Added ${data.company} · ${STATUS_LABELS[target]}`);
  } else if (app.status !== "closed" && STAGE_RANK[target] > (STAGE_RANK[app.status] ?? 0)) {
    const { error } = await supabase
      .from("applications")
      .update({
        status: target,
        close_reason: target === "closed" ? "rejected" : null,
        ...(app.date_applied ? {} : { date_applied: ev.received_at }),
      })
      .eq("id", app.id);
    if (error) throw new Error(error.message);
    app.status = target;
    notes.push(
      target === "closed"
        ? `${app.company} closed (rejected)`
        : `${app.company} moved to ${STATUS_LABELS[target]}`,
    );
  }

  // Views and messages are worth logging even when nothing else changes:
  // they feed the Viewed / Heard back numbers in Insights.
  if (ev.kind === "viewed" || ev.kind === "message") {
    const employerActive = ev.kind === "message";
    if (app.status === "no_response" || employerActive) {
      // Any sign of life takes it out of "No response"; a message also
      // restarts the 60-day clock (the update bumps updated_at).
      const { error } = await supabase
        .from("applications")
        .update(app.status === "no_response" ? { status: "applied" } : { updated_at: new Date().toISOString() })
        .eq("id", app.id);
      if (error) throw new Error(error.message);
      if (app.status === "no_response") app.status = "applied";
    }
    notes.push(
      ev.kind === "viewed"
        ? `${app.company} viewed your application`
        : `Message from ${app.company}`,
    );
  }

  if (ev.kind === "interview") {
    notes.push(...(await addInterview(supabase, userId, ev, app)));
  }

  return {
    status: notes.length > 0 ? "done" : "skipped",
    applicationId: app.id,
    result: notes.length > 0 ? notes.join(" · ") : `${app.company} already up to date`,
  };
}

// Adds the interview from an invite, without duplicating one that's already
// on the calendar. A missing time becomes a "confirm the time" task instead of
// a made-up slot.
async function addInterview(
  supabase: Client,
  userId: string,
  ev: InboxEvent,
  app: AppLite,
): Promise<string[]> {
  const { data: existing, error } = await supabase
    .from("interviews")
    .select("id, scheduled_at, outcome")
    .eq("application_id", app.id);
  if (error) throw new Error(error.message);

  const pending = (existing ?? []).filter((iv) => (iv.outcome ?? "pending") === "pending");
  const when = ev.interview_at;

  if (when) {
    const wanted = new Date(when).getTime();
    if (pending.some((iv) => iv.scheduled_at && new Date(iv.scheduled_at).getTime() === wanted)) {
      return [];
    }
    const unscheduled = pending.find((iv) => !iv.scheduled_at);
    const { error: writeError } = unscheduled
      ? await supabase.from("interviews").update({ scheduled_at: when }).eq("id", unscheduled.id)
      : await supabase.from("interviews").insert({
          user_id: userId,
          application_id: app.id,
          type: ev.interview_type ?? "other",
          round: (existing?.length ?? 0) + 1,
          scheduled_at: when,
          notes: ev.subject ? `From email: "${ev.subject}"` : null,
        });
    if (writeError) throw new Error(writeError.message);
    return [`interview ${formatDateTime(when)}`];
  }

  // No time in the email. If one is already pending, this is likely a
  // follow-up in the same thread.
  if (pending.length > 0) return [];

  const due = new Date();
  due.setHours(0, 0, 0, 0);
  const [{ error: ivError }, { error: taskError }] = await Promise.all([
    supabase.from("interviews").insert({
      user_id: userId,
      application_id: app.id,
      type: ev.interview_type ?? "other",
      round: (existing?.length ?? 0) + 1,
      scheduled_at: null,
      notes: ev.subject ? `From email: "${ev.subject}"` : null,
    }),
    supabase.from("tasks").insert({
      user_id: userId,
      application_id: app.id,
      title: `Confirm interview time with ${app.company}`,
      due_date: due.toISOString(),
      priority: "high",
    }),
  ]);
  if (ivError) throw new Error(ivError.message);
  if (taskError) throw new Error(taskError.message);
  return ["interview added — time to confirm"];
}

// Applies up to `limit` pending emails, oldest first. Returns how many were
// handled and how many are still waiting. An email that fails to apply stays
// pending and is retried next time.
export async function applyInboxEvents(
  supabase: Client,
  userId: string,
  limit: number,
): Promise<{ applied: number; remaining: number }> {
  const { data: events, error, count } = await supabase
    .from("inbox_events")
    .select("*", { count: "exact" })
    .eq("status", "pending")
    .order("received_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!events || events.length === 0) return { applied: 0, remaining: 0 };

  const { data: apps, error: appsError } = await supabase
    .from("applications")
    .select("id, company, role_title, status, date_applied, created_at");
  if (appsError) throw new Error(appsError.message);
  const known = [...(apps ?? [])];

  let applied = 0;
  for (const ev of events) {
    try {
      const outcome = await applyEvent(supabase, userId, ev, known);
      await supabase
        .from("inbox_events")
        .update({
          status: outcome.status,
          application_id: outcome.applicationId,
          result: outcome.result,
        })
        .eq("id", ev.id);
      applied++;
    } catch (e) {
      console.error("Couldn't apply inbox email", ev.id, e);
    }
  }
  return { applied, remaining: Math.max(0, (count ?? 0) - applied) };
}
