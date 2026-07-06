import { createClient } from "@/lib/supabase/server";

// Server-side storage helpers for the private "documents" bucket. Uploads
// happen client-side (direct to Storage, gated by RLS); these cover the
// operations we want to run with the user's server session.

const BUCKET = "documents";

// Short-lived signed URL for downloading a private object.
export async function createSignedDownloadUrl(
  path: string,
  expiresIn = 60,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn, { download: true });
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

// Removes an object from storage. Returns an error message or null.
export async function removeStorageObject(
  path: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return error ? error.message : null;
}

export const DOCUMENTS_BUCKET = BUCKET;
