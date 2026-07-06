"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsData } from "@/lib/analytics";
import {
  AXIS_TICK,
  GRID_STROKE,
  CHART_TEAL,
  ChartTooltip,
} from "./chart-common";

export function SourceChart({ data }: { data: AnalyticsData }) {
  const rows = data.bySource.map((s) => ({
    source: s.source,
    rate: Math.round(s.rate * 100),
    applied: s.applied,
    responded: s.responded,
  }));

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No source data in this range yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey="source" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis
          unit="%"
          domain={[0, 100]}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: GRID_STROKE, fillOpacity: 0.08 }}
          content={
            <ChartTooltip
              valueFormatter={(v, name) =>
                name === "rate" ? `${v}% responded` : `${v}`
              }
            />
          }
        />
        <Bar dataKey="rate" name="rate" fill={CHART_TEAL} radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
