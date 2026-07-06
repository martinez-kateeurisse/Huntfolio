import type { AnalyticsData } from "@/lib/analytics";

function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function KpiCards({ data }: { data: AnalyticsData }) {
  const { totals } = data;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label="Applications"
        value={String(totals.applications)}
        hint="Submitted in range"
      />
      <KpiCard
        label="Response rate"
        value={pct(totals.responseRate)}
        hint="Reached screening+"
      />
      <KpiCard
        label="Interview rate"
        value={pct(totals.interviewRate)}
        hint="Reached interview+"
      />
      <KpiCard
        label="Offer rate"
        value={pct(totals.offerRate)}
        hint="Reached offer"
      />
    </div>
  );
}
