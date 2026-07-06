"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Table2,
  CheckSquare,
  CalendarDays,
  FileText,
  BarChart3,
  BookOpen,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const TABS = [
  { href: "/applications", label: "Board", icon: LayoutGrid, match: /^\/applications(\/[^/]+)?$/, exclude: /^\/applications\/table/ },
  { href: "/applications/table", label: "Table", icon: Table2, match: /^\/applications\/table/ },
  { href: "/analytics", label: "Analytics", icon: BarChart3, match: /^\/analytics/ },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, match: /^\/calendar/ },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, match: /^\/tasks/ },
  { href: "/prep", label: "Prep", icon: BookOpen, match: /^\/prep/ },
  { href: "/contacts", label: "Contacts", icon: Users, match: /^\/contacts/ },
  { href: "/documents", label: "Documents", icon: FileText, match: /^\/documents/ },
];

export function Nav({ email }: { email: string | null }) {
  const pathname = usePathname();

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.exclude && tab.exclude.test(pathname)) return false;
    return tab.match.test(pathname);
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4">
        <Link href="/applications" className="mr-3 flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-xs">
            HF
          </span>
          <span className="hidden sm:inline">Huntfolio</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
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
        </div>
      </div>
    </header>
  );
}
