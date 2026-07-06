import { BarChart3 } from "lucide-react";
import { getAnalytics } from "@/lib/queries";
import { TRACKS } from "@/lib/constants";
import { AnalyticsFilters } from "@/components/analytics/filters";
import { KpiCards } from "@/components/analytics/kpi-cards";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { TrackBreakdown } from "@/components/analytics/track-breakdown";
import { SourceChart } from "@/components/analytics/source-chart";
import { TimeInStage } from "@/components/analytics/time-in-stage";
import { AppsOverTime } from "@/components/analytics/apps-over-time";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Analytics · Huntfolio" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function rangeToFrom(range: string): string | null {
  if (range === "30") return new Date(Date.now() - 30 * 86_400_000).toISOString();
  if (range === "90") return new Date(Date.now() - 90 * 86_400_000).toISOString();
  return null; // all time
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const track =
    sp.track && (sp.track === "all" || TRACKS.includes(sp.track as never))
      ? sp.track
      : "all";
  const range = ["30", "90", "all"].includes(sp.range ?? "")
    ? sp.range!
    : "90";

  const data = await getAnalytics({ track, from: rangeToFrom(range), to: null });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Analytics</h1>
        <AnalyticsFilters track={track} range={range} />
      </div>

      <KpiCards data={data} />

      {!data.hasEnoughData ? (
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="Not enough data yet"
          description="Once you've applied to a few more roles, this page fills in with your funnel, conversion rates, and where things stall. Keep applying!"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section
              title="Pipeline funnel"
              description="How many applications ever reached each stage."
            >
              <FunnelChart data={data} />
            </Section>
            <Section
              title="Traction by track"
              description="Which track is converting best."
            >
              <TrackBreakdown data={data} />
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section
              title="Response rate by source"
              description="Reached screening ÷ applied, per source."
            >
              <SourceChart data={data} />
            </Section>
            <Section
              title="Average time in stage"
              description="Where applications tend to stall (completed transitions only)."
            >
              <TimeInStage data={data} />
            </Section>
          </div>

          <Section
            title="Applications over time"
            description="Weekly applications by date applied."
          >
            <AppsOverTime data={data} />
          </Section>
        </div>
      )}
    </div>
  );
}
