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
  CHART_ACCENT,
  ChartTooltip,
} from "./chart-common";

export function AppsOverTime({ data }: { data: AnalyticsData }) {
  if (data.overTime.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No applications in this range yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data.overTime}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: GRID_STROKE, fillOpacity: 0.08 }}
          content={
            <ChartTooltip
              valueFormatter={(v) => `${v} application${v === 1 ? "" : "s"}`}
            />
          }
        />
        <Bar
          dataKey="count"
          name="count"
          fill={CHART_ACCENT}
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
