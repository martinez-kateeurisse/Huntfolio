import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const cur = currency ?? "PHP";
  const fmt = (n: number) => n.toLocaleString("en-US");
  if (min != null && max != null) return `${cur} ${fmt(min)}–${fmt(max)}`;
  if (min != null) return `${cur} ${fmt(min)}+`;
  return `Up to ${cur} ${fmt(max!)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy · h:mma");
}

// Whole days since a past date (0 = today).
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return differenceInCalendarDays(new Date(), new Date(iso));
}

// Friendly label for a due date, with an "overdue" flag for styling.
export function dueLabel(iso: string | null | undefined): {
  label: string;
  overdue: boolean;
  soon: boolean;
} | null {
  if (!iso) return null;
  const date = new Date(iso);
  const diff = differenceInCalendarDays(date, new Date());
  const overdue = diff < 0;
  const soon = diff >= 0 && diff <= 3;

  let label: string;
  if (isToday(date)) label = "Today";
  else if (isTomorrow(date)) label = "Tomorrow";
  else if (isYesterday(date)) label = "Yesterday";
  else if (diff < 0) label = `${Math.abs(diff)}d overdue`;
  else label = `in ${diff}d`;

  return { label, overdue, soon };
}
