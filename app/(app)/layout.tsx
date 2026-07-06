import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/demo";
import { Nav } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | null = "demo@huntfolio.app";

  if (!IS_DEMO) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Middleware already guards these routes, but double-check server-side.
    if (!user) redirect("/login");
    email = user.email ?? null;
  }

  return (
    <div className="flex min-h-full flex-col">
      {IS_DEMO && (
        <div className="bg-amber-500/15 px-4 py-1.5 text-center text-xs text-amber-700 dark:text-amber-300">
          Demo mode — sample data, no sign-in. Add Supabase credentials to
          `.env.local` to use it for real.
        </div>
      )}
      <Nav email={email} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
