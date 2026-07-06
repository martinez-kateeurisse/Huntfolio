// Client-safe demo flag. Pure (no Node imports) so it can be imported from
// client components as well as the server store in lib/demo.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const IS_DEMO = url === "" || url.includes("placeholder");
