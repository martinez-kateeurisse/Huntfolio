"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/is-demo";
import { applyInboxEvents } from "@/lib/inbox/apply";
import type { ActionResult } from "@/lib/actions/applications";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// The tables come from supabase/migrations/0003_inbox.sql; say so plainly if
// it hasn't been run yet.
function friendly(message: string) {
  return /inbox_(connections|events)|schema cache|does not exist/i.test(message)
    ? "Gmail sync needs a one-time database update: run supabase/migrations/0003_inbox.sql in the Supabase SQL Editor."
    : message;
}

// Creates (or replaces) the key the Gmail script sends. Only a hash is
// stored, so the key is shown once; replacing it disconnects the old script.
export async function createInboxKey(): Promise<ActionResult<{ token: string }>> {
  if (IS_DEMO) {
    return { ok: false, error: "Gmail sync isn't available in demo mode." };
  }
  const { supabase, userId } = await requireUser();
  const token = `hf_${randomBytes(24).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabase.from("inbox_connections").upsert(
    {
      user_id: userId,
      token_hash: tokenHash,
      created_at: new Date().toISOString(),
      last_seen_at: null,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/");
  return { ok: true, data: { token } };
}

export async function disconnectInbox(): Promise<ActionResult> {
  if (IS_DEMO) return { ok: true };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("inbox_connections")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/");
  return { ok: true };
}

// Applies every waiting email now instead of a few per page load.
export async function addInboxEmailsNow(): Promise<
  ActionResult<{ applied: number; remaining: number }>
> {
  if (IS_DEMO) return { ok: true, data: { applied: 0, remaining: 0 } };
  const { supabase, userId } = await requireUser();
  try {
    const result = await applyInboxEvents(supabase, userId, 200);
    revalidatePath("/", "layout");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: friendly(e instanceof Error ? e.message : String(e)) };
  }
}
