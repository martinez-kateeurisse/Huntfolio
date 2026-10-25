// Runs once per server instance, before any request is handled.
export function register() {
  // Server components format dates and bucket tasks ("today", "overdue") with
  // the server's clock. Vercel runs in UTC, which shifts all-day tasks and
  // dates by the user's offset and makes server HTML disagree with the
  // browser. This is a single-user app, so run the server in the user's zone.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = process.env.APP_TIMEZONE || "Asia/Manila";
  }
}
