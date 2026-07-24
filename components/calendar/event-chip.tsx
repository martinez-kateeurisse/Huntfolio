import { cn } from "@/lib/utils";
import { formatTime, hasDueTime } from "@/lib/format";
import type { CalendarEvent } from "@/lib/queries";

// Interviews and tasks get distinct colors so the month reads at a glance.
export const EVENT_COLORS = {
  interview:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  task: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
} as const;

export function EventChip({
  event,
  showTime = true,
  className,
  onClick,
}: {
  event: CalendarEvent;
  showTime?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  // Interviews always have a time; an all-day task has none to show.
  const timed = event.kind === "interview" || hasDueTime(event.date);
  const time = timed ? formatTime(event.date) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={event.title}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight",
        EVENT_COLORS[event.kind],
        onClick && "hover:brightness-95 dark:hover:brightness-110",
        className,
      )}
    >
      {showTime && time && (
        <span className="shrink-0 tabular-nums opacity-70">{time}</span>
      )}
      <span className="truncate">{event.title}</span>
    </button>
  );
}
