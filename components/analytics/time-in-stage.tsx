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
import { STAGE_LABELS } from "@/lib/analytics";
import {
  AXIS_TICK,
  GRID_STROKE,
  CHART_AMBER,
  ChartTooltip,
} from "./chart-common";

export function TimeInStage({ data }: { data: AnalyticsData }) {
  const rows = data.timeInStage.map((d) => ({
    label: STAGE_LABELS[d.stage],
    days: Math.round(d.avgDays * 10) / 10,
    n: d.n,
  }));

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Not enough completed transitions yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis
          unit="d"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          allowDecimals
        />
        <Tooltip
          cursor={{ fill: GRID_STROKE, fillOpacity: 0.08 }}
          content={
            <ChartTooltip
              valueFormatter={(v, name) =>
                name === "days" ? `${v} days avg` : `${v}`
              }
            />
          }
        />
        <Bar dataKey="days" name="days" fill={CHART_AMBER} radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
