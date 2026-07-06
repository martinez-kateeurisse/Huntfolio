"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarEvent } from "@/lib/queries";
import { DayCell } from "@/components/calendar/day-cell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(d: Date | string) {
  return format(new Date(d), "yyyy-MM-dd");
}

export function MonthGrid({
  monthISO,
  events,
  onDayOpen,
}: {
  monthISO: string;
  events: CalendarEvent[];
  onDayOpen: (day: Date) => void;
}) {
  const month = new Date(monthISO);
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDay = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = dayKey(ev.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            events={byDay.get(dayKey(day)) ?? []}
            isToday={isToday(day)}
            inMonth={isSameMonth(day, month)}
            onOpen={onDayOpen}
          />
        ))}
      </div>
    </div>
  );
}
