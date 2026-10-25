"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  House,
  KeyRound,
  Library,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IS_DEMO } from "@/lib/is-demo";
import { NAV_AREAS, areaOf, type NavArea } from "@/lib/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import { SetPasswordDialog } from "@/components/auth/set-password-dialog";

const ICONS: Record<NavArea, React.ElementType> = {
  today: House,
  applications: Briefcase,
  schedule: CalendarDays,
  library: Library,
  insights: BarChart3,
};

// Top bar: brand, the five areas (desktop), theme + account.
export function Nav({ email }: { email: string | null }) {
  const active = areaOf(usePathname());
  const [settingPassword, setSettingPassword] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:px-6">
        <Link href="/" className="mr-4 flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-xs">
            HF
          </span>
          <span>Huntfolio</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {NAV_AREAS.map((area) => {
            const Icon = ICONS[area.key];
            const isActive = active === area.key;
            return (
              <Link
                key={area.key}
                href={area.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {area.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account">
                <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-medium uppercase">
                  {email?.[0] ?? "?"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {email ?? "Signed in"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!IS_DEMO && (
                <DropdownMenuItem onClick={() => setSettingPassword(true)}>
                  <KeyRound className="mr-2 size-4" />
                  Set password
                </DropdownMenuItem>
              )}
              <form action={signOut}>
                <button type="submit" className="w-full">
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <span className="flex w-full items-center">
                      <LogOut className="mr-2 size-4" />
                      Sign out
                    </span>
                  </DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
          <SetPasswordDialog
            open={settingPassword}
            onOpenChange={setSettingPassword}
          />
        </div>
      </div>
    </header>
  );
}

// Phone: the same five areas as a fixed bottom tab bar, within thumb reach.
export function MobileNav() {
  const active = areaOf(usePathname());

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5">
        {NAV_AREAS.map((area) => {
          const Icon = ICONS[area.key];
          const isActive = active === area.key;
          return (
            <Link
              key={area.key}
              href={area.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5", isActive && "stroke-[2.25]")} />
              {area.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
