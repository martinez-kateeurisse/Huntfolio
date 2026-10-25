"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SectionTab } from "@/lib/navigation";

// One header shape for every page: title, a short line of context, the page's
// primary action(s), and — for areas with several pages — section tabs.
export function PageHeader({
  title,
  description,
  actions,
  tabs,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: SectionTab[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {tabs && <SectionTabs tabs={tabs} />}
    </div>
  );
}

function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const pathname = usePathname();
  return (
    // The baseline is an inset shadow (not a border) so the active underline
    // can sit on it without overflowing the horizontally scrollable strip.
    <nav className="flex gap-5 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 pb-2 text-sm font-medium transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
