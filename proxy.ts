import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Demo mode (no real Supabase configured): skip auth entirely so the interface
// is browsable. Checked inline here because the demo store can't be imported
// into the edge runtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const IS_DEMO = url === "" || url.includes("placeholder");

// Next 16 renamed the "middleware" convention to "proxy". Same behaviour:
// runs on every matched request to refresh the Supabase session and guard
// protected routes.
export async function proxy(request: NextRequest) {
  if (IS_DEMO) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
