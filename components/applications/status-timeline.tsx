import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import type { StatusHistory } from "@/lib/database.types";

export function StatusTimeline({ history }: { history: StatusHistory[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No status changes yet.</p>
    );
  }

  return (
    <ol className="relative ml-1 border-l pl-5">
      {history.map((h) => (
        <li key={h.id} className="relative pb-4 last:pb-0">
          <span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full border-2 border-background bg-muted-foreground" />
          <div className="flex flex-wrap items-center gap-2">
            {h.from_status ? (
              <>
                <StatusBadge status={h.from_status} />
                <span className="text-muted-foreground">→</span>
                <StatusBadge status={h.to_status} />
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">Added as</span>
                <StatusBadge status={h.to_status} />
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(h.changed_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
