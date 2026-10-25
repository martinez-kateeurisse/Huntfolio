import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { IS_DEMO } from "@/lib/is-demo";
import { classifyEmail } from "@/lib/inbox/classify";
import type { Database } from "@/lib/database.types";

// Receives job-related emails from the user's Gmail Apps Script (see
// lib/inbox/apps-script.ts). Classifies them with keyword rules and stores
// only what's needed to act on them; the full excerpt is discarded here.
// The script authenticates with the per-user secret from "Connect Gmail".

const payloadSchema = z.object({
  messages: z
    .array(
      z.object({
        message_id: z.string().min(1).max(200),
        received_at: z
          .string()
          .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
        from: z.string().max(500),
        subject: z.string().max(1000),
        body: z.string().max(5000),
      }),
    )
    .max(50),
});

export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing key" }, { status: 401 });
  }
  if (IS_DEMO) return NextResponse.json({ ok: true, mode: "demo", stored: 0 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const events = parsed.data.messages.flatMap((m) => {
    const c = classifyEmail({
      from: m.from,
      subject: m.subject,
      body: m.body,
      receivedAt: m.received_at,
    });
    if (!c.kind) return [];
    return [
      {
        message_id: m.message_id,
        received_at: new Date(m.received_at).toISOString(),
        from_name: c.fromName,
        from_email: c.fromEmail,
        subject: m.subject,
        snippet: c.snippet,
        kind: c.kind,
        company: c.company,
        role_title: c.roleTitle,
        interview_at: c.interviewAt,
        interview_type: c.interviewType,
      },
    ];
  });

  // No user session here: the secret is checked inside the database function,
  // which only ever writes rows for that secret's owner.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: stored, error } = await supabase.rpc("inbox_ingest", {
    p_token: token,
    p_events: events,
  });

  if (error) {
    const unauthorized = error.code === "28000";
    return NextResponse.json(
      { ok: false, error: unauthorized ? "Unknown key — reconnect Gmail in Huntfolio" : error.message },
      { status: unauthorized ? 401 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    received: parsed.data.messages.length,
    jobRelated: events.length,
    stored: stored ?? 0,
  });
}
