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

// Due dates are a single timestamp. Exactly local midnight means "no
// particular time" — the task is all-day — so the time is only shown when the
// user actually picked one.
export function hasDueTime(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

// Combine the date + time inputs of a form into a stored timestamp. An empty
// time means all-day, i.e. local midnight.
export function toDueTimestamp(
  date: string,
  time?: string,
): string | undefined {
  if (!date) return undefined;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const local = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  return Number.isNaN(local.getTime()) ? undefined : local.toISOString();
}

export function formatTime(iso: string): string {
  return format(new Date(iso), "h:mma").toLowerCase();
}

// Friendly label for a due date, with an "overdue" flag for styling.
export function dueLabel(iso: string | null | undefined): {
  label: string;
  overdue: boolean;
  soon: boolean;
  timed: boolean;
} | null {
  if (!iso) return null;
  const date = new Date(iso);
  const diff = differenceInCalendarDays(date, new Date());
  const timed = hasDueTime(iso);
  // A task with a time is overdue the moment it passes; an all-day one only
  // once its whole day is behind us.
  const overdue = timed ? date.getTime() < Date.now() : diff < 0;
  const soon = !overdue && diff >= 0 && diff <= 3;

  let label: string;
  if (isToday(date)) label = "Today";
  else if (isTomorrow(date)) label = "Tomorrow";
  else if (isYesterday(date)) label = "Yesterday";
  else if (diff < 0) label = `${Math.abs(diff)}d overdue`;
  else label = `in ${diff}d`;
  if (timed) label += ` · ${formatTime(iso)}`;

  return { label, overdue, soon, timed };
}
