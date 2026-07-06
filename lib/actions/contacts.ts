"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { contactSchema, type ContactFormValues } from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/applications";
import {
  IS_DEMO,
  demoCreateContact,
  demoUpdateContact,
  demoDeleteContact,
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

function revalidate(applicationId?: string | null) {
  revalidatePath("/contacts");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function createContact(
  values: ContactFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const v = parsed.data;
  const applicationId = v.application_id ? v.application_id : null;

  if (IS_DEMO) {
    const res = demoCreateContact(values);
    revalidate(applicationId);
    return { ok: true, data: res };
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      application_id: applicationId,
      name: v.name,
      role: nullify(v.role),
      company: nullify(v.company),
      email: nullify(v.email),
      linkedin: nullify(v.linkedin),
      notes: nullify(v.notes),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate(applicationId);
  return { ok: true, data: { id: data.id } };
}

export async function updateContact(
  id: string,
  values: ContactFormValues,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const v = parsed.data;
  const applicationId = v.application_id ? v.application_id : null;

  if (IS_DEMO) {
    demoUpdateContact(id, values);
    revalidate(applicationId);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("contacts")
    .update({
      name: v.name,
      role: nullify(v.role),
      company: nullify(v.company),
      email: nullify(v.email),
      linkedin: nullify(v.linkedin),
      notes: nullify(v.notes),
      application_id: applicationId,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidate(applicationId);
  return { ok: true };
}

export async function deleteContact(
  id: string,
  applicationId?: string | null,
): Promise<ActionResult> {
  if (IS_DEMO) {
    demoDeleteContact(id);
    revalidate(applicationId);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate(applicationId);
  return { ok: true };
}
