import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Status } from "@/lib/constants";

// Neutral by default; interview/offer/closed get a hint of meaning.
const STATUS_CLASS: Record<Status, string> = {
  saved: "bg-muted text-muted-foreground",
  applied: "bg-muted text-foreground",
  screening: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  interview:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  offer:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = (status in STATUS_LABELS ? status : "saved") as Status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none",
        STATUS_CLASS[s],
        className,
      )}
    >
      {STATUS_LABELS[s]}
    </span>
  );
}
