"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { documentSchema, type DocumentFormValues } from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/applications";
import {
  createSignedDownloadUrl,
  removeStorageObject,
} from "@/lib/storage";
import {
  IS_DEMO,
  demoCreateDocument,
  demoSetDefaultDocument,
  demoDeleteDocument,
  demoAttachDocument,
  demoDetachDocument,
} from "@/lib/demo";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function createDocument(
  values: DocumentFormValues,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = documentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const v = parsed.data;

  if (IS_DEMO) {
    const res = demoCreateDocument(values, id);
    revalidatePath("/documents");
    return { ok: true, data: res };
  }

  const { supabase, userId } = await requireUser();

  // Only one default per type: clear existing defaults first.
  if (v.is_default) {
    await supabase
      .from("documents")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("type", v.type);
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      ...(id ? { id } : {}),
      user_id: userId,
      name: v.name,
      type: v.type,
      version_label: v.version_label || null,
      file_url: v.file_url,
      is_default: v.is_default ?? false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/documents");
  return { ok: true, data: { id: data.id } };
}

export async function setDefaultDocument(id: string): Promise<ActionResult> {
  if (IS_DEMO) {
    demoSetDefaultDocument(id);
    revalidatePath("/documents");
    return { ok: true };
  }

  const { supabase, userId } = await requireUser();
  const { data: doc, error: readErr } = await supabase
    .from("documents")
    .select("type")
    .eq("id", id)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  await supabase
    .from("documents")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("type", doc.type ?? "other");

  const { error } = await supabase
    .from("documents")
    .update({ is_default: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  if (IS_DEMO) {
    demoDeleteDocument(id);
    revalidatePath("/documents");
    revalidatePath("/applications");
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { data: doc, error: readErr } = await supabase
    .from("documents")
    .select("file_url")
    .eq("id", id)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  // Remove the storage object first; don't orphan the file if the row goes.
  if (doc.file_url) {
    const storageErr = await removeStorageObject(doc.file_url);
    if (storageErr) {
      return { ok: false, error: `Couldn't delete the file: ${storageErr}` };
    }
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/documents");
  revalidatePath("/applications");
  return { ok: true };
}

export async function getDocumentDownloadUrl(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  if (IS_DEMO) {
    return {
      ok: false,
      error: "Downloads need a connected Supabase project (demo has no files).",
    };
  }

  const { supabase } = await requireUser();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("file_url")
    .eq("id", id)
    .single();
  if (error) return { ok: false, error: error.message };
  if (!doc.file_url) return { ok: false, error: "No file on record." };

  const { url, error: urlErr } = await createSignedDownloadUrl(doc.file_url);
  if (urlErr || !url) {
    return { ok: false, error: urlErr ?? "Couldn't create a download link." };
  }
  return { ok: true, data: { url } };
}

export async function attachDocument(
  applicationId: string,
  documentId: string,
): Promise<ActionResult> {
  if (IS_DEMO) {
    demoAttachDocument(applicationId, documentId);
    revalidatePath(`/applications/${applicationId}`);
    return { ok: true };
  }

  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("application_documents").insert({
    application_id: applicationId,
    document_id: documentId,
    user_id: userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/applications/${applicationId}`);
  return { ok: true };
}

export async function detachDocument(
  applicationId: string,
  documentId: string,
): Promise<ActionResult> {
  if (IS_DEMO) {
    demoDetachDocument(applicationId, documentId);
    revalidatePath(`/applications/${applicationId}`);
    return { ok: true };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("application_documents")
    .delete()
    .eq("application_id", applicationId)
    .eq("document_id", documentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/applications/${applicationId}`);
  return { ok: true };
}
