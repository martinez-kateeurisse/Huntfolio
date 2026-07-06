import { cn } from "@/lib/utils";
import { TRACK_LABELS, TRACK_PILL_CLASS, type Track } from "@/lib/constants";

export function TrackPill({
  track,
  className,
}: {
  track: string | null | undefined;
  className?: string;
}) {
  if (!track || !(track in TRACK_LABELS)) return null;
  const t = track as Track;
  return (
    <span
      className={cn(
        "track-pill inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none",
        TRACK_PILL_CLASS[t],
        className,
      )}
    >
      {TRACK_LABELS[t]}
    </span>
  );
}
