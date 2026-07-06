"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { interviewSchema, type InterviewFormValues } from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/applications";
import {
  IS_DEMO,
  demoCreateInterview,
  demoUpdateInterview,
  demoDeleteInterview,
} from "@/lib/demo";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function nullify(v: string | undefined | null): string | null {
  return v === undefined || v === null || v === "" ? null : v;
}

function revalidate(applicationId: string) {
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
  revalidatePath("/calendar");
}

export async function createInterview(
  values: InterviewFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = interviewSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const v = parsed.data;

  if (IS_DEMO) {
    const { id } = demoCreateInterview(values);
    revalidate(v.application_id);
    return { ok: true, data: { id } };
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("interviews")
    .insert({
      user_id: userId,
      application_id: v.application_id,
      type: nullify(v.type),
      scheduled_at: nullify(v.scheduled_at),
      location: nullify(v.location),
      notes: nullify(v.notes),
      outcome: v.outcome ?? "pending",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate(v.application_id);
  return { ok: true, data: { id: data.id } };
}

export async function updateInterview(
  id: string,
  values: InterviewFormValues,
): Promise<ActionResult> {
  const parsed = interviewSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const v = parsed.data;

  if (IS_DEMO) {
    demoUpdateInterview(id, values);
    revalidate(v.application_id);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("interviews")
    .update({
      type: nullify(v.type),
      scheduled_at: nullify(v.scheduled_at),
      location: nullify(v.location),
      notes: nullify(v.notes),
      outcome: v.outcome ?? "pending",
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidate(v.application_id);
  return { ok: true };
}

export async function deleteInterview(
  id: string,
  applicationId: string,
): Promise<ActionResult> {
  if (IS_DEMO) {
    demoDeleteInterview(id);
    revalidate(applicationId);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("interviews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate(applicationId);
  return { ok: true };
}
