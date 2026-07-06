"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsData } from "@/lib/analytics";
import { AXIS_TICK, GRID_STROKE, ChartTooltip } from "./chart-common";

// Deepening indigo ramp: further into the funnel = darker.
const STAGE_SERIES = [
  { key: "applied", name: "Applied", color: "#c7d2fe" },
  { key: "screening", name: "Screening", color: "#818cf8" },
  { key: "interview", name: "Interview", color: "#6366f1" },
  { key: "offer", name: "Offer", color: "#4338ca" },
] as const;

export function TrackBreakdown({ data }: { data: AnalyticsData }) {
  const rows = data.byTrack.filter(
    (t) => t.applied + t.screening + t.interview + t.offer > 0,
  );

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No track data in this range yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: GRID_STROKE, fillOpacity: 0.08 }}
          content={<ChartTooltip />}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        {STAGE_SERIES.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            radius={[3, 3, 0, 0]}
            maxBarSize={26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
