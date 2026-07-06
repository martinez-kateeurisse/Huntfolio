"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepNoteSchema, type PrepNoteFormValues } from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/applications";
import {
  IS_DEMO,
  demoCreatePrepNote,
  demoUpdatePrepNote,
  demoDeletePrepNote,
} from "@/lib/demo";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function revalidate(applicationId?: string | null) {
  revalidatePath("/prep");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function createPrepNote(
  values: PrepNoteFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = prepNoteSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const v = parsed.data;
  const applicationId = v.application_id ? v.application_id : null;

  if (IS_DEMO) {
    const res = demoCreatePrepNote(values);
    revalidate(applicationId);
    return { ok: true, data: res };
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("prep_notes")
    .insert({
      user_id: userId,
      application_id: applicationId,
      category: v.category,
      title: v.title,
      content: v.content || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate(applicationId);
  return { ok: true, data: { id: data.id } };
}

export async function updatePrepNote(
  id: string,
  values: PrepNoteFormValues,
): Promise<ActionResult> {
  const parsed = prepNoteSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const v = parsed.data;
  const applicationId = v.application_id ? v.application_id : null;

  if (IS_DEMO) {
    demoUpdatePrepNote(id, values);
    revalidate(applicationId);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("prep_notes")
    .update({
      category: v.category,
      title: v.title,
      content: v.content || null,
      application_id: applicationId,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidate(applicationId);
  return { ok: true };
}

export async function deletePrepNote(
  id: string,
  applicationId?: string | null,
): Promise<ActionResult> {
  if (IS_DEMO) {
    demoDeletePrepNote(id);
    revalidate(applicationId);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("prep_notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate(applicationId);
  return { ok: true };
}
