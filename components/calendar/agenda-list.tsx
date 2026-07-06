"use client";

import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import type { CalendarEvent } from "@/lib/queries";
import type { Interview } from "@/lib/database.types";
import { EventRow } from "@/components/calendar/event-row";

function dayHeading(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMM d");
}

export function AgendaList({
  events,
  onEditInterview,
}: {
  events: CalendarEvent[];
  onEditInterview: (interview: Interview) => void;
}) {
  // Upcoming only (from the start of today), chronological.
  const todayStart = startOfDay(new Date());
  const upcoming = events
    .filter((e) => new Date(e.date) >= todayStart)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (upcoming.length === 0) {
    return (
      <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nothing coming up this month.
      </p>
    );
  }

  // Group by calendar day.
  const groups: { key: string; date: Date; items: CalendarEvent[] }[] = [];
  for (const ev of upcoming) {
    const d = new Date(ev.date);
    const key = format(d, "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(ev);
    else groups.push({ key, date: d, items: [ev] });
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {dayHeading(g.date)}
          </h2>
          {g.items.map((ev) => (
            <EventRow key={ev.id} event={ev} onEditInterview={onEditInterview} />
          ))}
        </section>
      ))}
    </div>
  );
}
