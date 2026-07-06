import { ChevronDown } from "lucide-react";
import type { AnalyticsData } from "@/lib/analytics";

// Horizontal funnel: bar width ∝ count relative to the top (Applied) level, with
// the stage-to-stage conversion shown between rows.
export function FunnelChart({ data }: { data: AnalyticsData }) {
  const top = data.funnel[0]?.count ?? 0;

  return (
    <div className="flex flex-col gap-0.5">
      {data.funnel.map((level, i) => {
        const width = top === 0 ? 0 : (level.count / top) * 100;
        const conv = data.conversions[i - 1];
        return (
          <div key={level.stage}>
            {i > 0 && conv && (
              <div className="flex items-center gap-1 py-1 pl-1 text-xs text-muted-foreground">
                <ChevronDown className="size-3" />
                {Math.round(conv.rate * 100)}% continued
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-sm text-muted-foreground">
                {level.label}
              </div>
              <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-muted">
                <div
                  className="flex h-full items-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all"
                  style={{ width: `${Math.max(width, 6)}%` }}
                >
                  {level.count}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
