import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { getCalendarEvents } from "@/lib/queries";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata = { title: "Calendar · Huntfolio" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const parsed = month ? parse(month, "yyyy-MM", new Date()) : new Date();
  const base = isValid(parsed) ? parsed : new Date();

  const monthStart = startOfMonth(base);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(endOfMonth(monthStart));

  const events = await getCalendarEvents(
    gridStart.toISOString(),
    gridEnd.toISOString(),
  );

  const prev = format(subMonths(monthStart, 1), "yyyy-MM");
  const next = format(addMonths(monthStart, 1), "yyyy-MM");

  return (
    <CalendarView
      events={events}
      monthISO={monthStart.toISOString()}
      monthLabel={format(monthStart, "MMMM yyyy")}
      prevHref={`/calendar?month=${prev}`}
      nextHref={`/calendar?month=${next}`}
      todayHref="/calendar"
    />
  );
}
