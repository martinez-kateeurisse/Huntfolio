import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { IS_DEMO } from "@/lib/is-demo";
import type { Database } from "@/lib/database.types";

// Daily keep-alive, called by the Vercel cron in vercel.json. Supabase pauses
// free-tier projects after a week without traffic, which takes the live app
// down; one tiny query a day keeps the project awake. Also works as a manual
// "is the backend reachable?" check.
export async function GET(request: NextRequest) {
  // When CRON_SECRET is set, Vercel sends it as a bearer token on cron calls.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (IS_DEMO) return NextResponse.json({ ok: true, mode: "demo" });

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  // Anonymous, so RLS returns no rows — but the query still reaches Postgres,
  // which is what counts as activity.
  const { error } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
