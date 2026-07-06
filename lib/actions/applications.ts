"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applicationSchema, type ApplicationFormValues } from "@/lib/schemas";
import { APPLIED_OR_BEYOND, type Status } from "@/lib/constants";
import type { ApplicationInsert, ApplicationUpdate } from "@/lib/database.types";
import {
  IS_DEMO,
  demoCreateApplication,
  demoUpdateApplication,
  demoDeleteApplication,
  demoUpdateApplicationStatus,
} from "@/lib/demo";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// Empty strings from selects/inputs become null in the database.
function nullify(v: string | undefined | null): string | null {
  return v === undefined || v === null || v === "" ? null : v;
}

function toPayload(
  values: ReturnType<typeof applicationSchema.parse>,
): Omit<ApplicationInsert, "user_id"> {
  return {
    company: values.company,
    role_title: values.role_title,
    job_url: nullify(values.job_url),
    source: nullify(values.source),
    location: nullify(values.location),
    work_mode: nullify(values.work_mode),
    salary_min: values.salary_min ?? null,
    salary_max: values.salary_max ?? null,
    salary_currency: values.salary_currency || "PHP",
    status: values.status,
    // close_reason only makes sense when closed.
    close_reason:
      values.status === "closed" ? nullify(values.close_reason) : null,
    track: nullify(values.track),
    priority: values.priority,
    date_applied: nullify(values.date_applied),
    notes: nullify(values.notes),
  };
}

function revalidateAll(id?: string) {
  revalidatePath("/applications");
  revalidatePath("/applications/table");
  revalidatePath("/tasks");
  if (id) revalidatePath(`/applications/${id}`);
}

export async function createApplication(
  values: ApplicationFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  if (IS_DEMO) {
    const { id } = demoCreateApplication(values);
    revalidateAll(id);
    return { ok: true, data: { id } };
  }

  const { supabase, userId } = await requireUser();
  const payload = toPayload(parsed.data);

  // If saved directly as applied-or-beyond without a date, stamp today.
  if (
    !payload.date_applied &&
    APPLIED_OR_BEYOND.includes(payload.status as Status)
  ) {
    payload.date_applied = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateAll(data.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateApplication(
  id: string,
  values: ApplicationFormValues,
): Promise<ActionResult> {
  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  if (IS_DEMO) {
    demoUpdateApplication(id, values);
    revalidateAll(id);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const payload = toPayload(parsed.data);

  if (
    !payload.date_applied &&
    APPLIED_OR_BEYOND.includes(payload.status as Status)
  ) {
    payload.date_applied = new Date().toISOString();
  }

  const { error } = await supabase
    .from("applications")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateAll(id);
  return { ok: true };
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  if (IS_DEMO) {
    demoDeleteApplication(id);
    revalidateAll(id);
    return { ok: true };
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll(id);
  return { ok: true };
}

// Used by the board's drag-and-drop. The DB trigger logs the history row.
export async function updateApplicationStatus(
  id: string,
  status: Status,
  closeReason?: string | null,
): Promise<ActionResult> {
  if (IS_DEMO) {
    demoUpdateApplicationStatus(id, status, closeReason);
    revalidateAll(id);
    return { ok: true };
  }

  const { supabase } = await requireUser();

  // Read the current row so we can set date_applied on first apply and clear
  // close_reason when moving out of "closed".
  const { data: current, error: readErr } = await supabase
    .from("applications")
    .select("status, date_applied")
    .eq("id", id)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  const patch: ApplicationUpdate = { status };

  if (status === "closed") {
    patch.close_reason = closeReason ?? null;
  } else {
    patch.close_reason = null;
  }

  if (
    APPLIED_OR_BEYOND.includes(status) &&
    !current.date_applied
  ) {
    patch.date_applied = new Date().toISOString();
  }

  const { error } = await supabase
    .from("applications")
    .update(patch)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateAll(id);
  return { ok: true };
}
