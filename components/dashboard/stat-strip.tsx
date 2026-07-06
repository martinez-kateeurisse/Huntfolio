import { Activity, CalendarCheck, PercentCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/queries";

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          accent && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatStrip({ stats }: { stats: DashboardStats }) {
  const responseRate =
    stats.responseRate == null
      ? "—"
      : `${Math.round(stats.responseRate * 100)}%`;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Active applications"
        value={String(stats.active)}
        hint="Not yet closed"
        icon={<Activity className="size-4" />}
      />
      <StatCard
        label="Response rate"
        value={responseRate}
        hint={
          stats.appliedCount > 0
            ? `${stats.respondedCount} of ${stats.appliedCount} applied`
            : "No applications yet"
        }
        icon={<PercentCircle className="size-4" />}
      />
      <StatCard
        label="Applied this week"
        value={String(stats.appliedThisWeek)}
        hint="Last 7 days"
        icon={<CalendarCheck className="size-4" />}
      />
      <StatCard
        label="Tasks due soon"
        value={String(stats.tasksDueSoon)}
        hint="Within 3 days"
        icon={<Bell className="size-4" />}
        accent={stats.tasksDueSoon > 0}
      />
    </div>
  );
}
