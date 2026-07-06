"use client";

import type { Track } from "@/lib/constants";

// Colors chosen to read well on both light and dark backgrounds.
export const TRACK_HEX: Record<Track, string> = {
  dev: "#8b5cf6", // violet
  qa: "#3b82f6", // blue
  data: "#14b8a6", // teal
  ai: "#fb7185", // coral
};

export const CHART_ACCENT = "#6366f1"; // indigo, for single-series bars
export const CHART_TEAL = "#14b8a6";
export const CHART_AMBER = "#f59e0b";

// Neutral axis/grid tones that work in light and dark.
export const AXIS_TICK = { fill: "#94a3b8", fontSize: 12 };
export const GRID_STROKE = "#94a3b8";

// A tooltip styled with theme tokens so it adapts to light/dark.
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string | number;
  valueFormatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color ?? entry.fill }}
          />
          <span>
            {valueFormatter
              ? valueFormatter(entry.value, entry.name)
              : `${entry.name}: ${entry.value}`}
          </span>
        </div>
      ))}
    </div>
  );
}
