import type { DashboardStats } from "@/lib/queries";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="truncate text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && (
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// Three headline numbers in one quiet strip (deeper numbers live in Insights).
export function StatStrip({ stats }: { stats: DashboardStats }) {
  const responseRate =
    stats.responseRate == null
      ? "—"
      : `${Math.round(stats.responseRate * 100)}%`;

  return (
    <div className="grid grid-cols-3 divide-x rounded-xl border bg-card">
      <Stat label="Active" value={String(stats.active)} hint="Not yet closed" />
      <Stat
        label="Response rate"
        value={responseRate}
        hint={
          stats.appliedCount > 0
            ? `${stats.respondedCount} of ${stats.appliedCount} applied`
            : "Nothing applied yet"
        }
      />
      <Stat
        label="Applied this week"
        value={String(stats.appliedThisWeek)}
        hint="Last 7 days"
      />
    </div>
  );
}
