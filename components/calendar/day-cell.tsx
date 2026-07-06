"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/queries";
import { EventChip } from "@/components/calendar/event-chip";

const MAX_VISIBLE = 3;

export function DayCell({
  day,
  events,
  isToday,
  inMonth,
  onOpen,
}: {
  day: Date;
  events: CalendarEvent[];
  isToday: boolean;
  inMonth: boolean;
  onOpen: (day: Date) => void;
}) {
  const visible = events.slice(0, MAX_VISIBLE);
  const overflow = events.length - visible.length;

  return (
    <div
      onClick={() => onOpen(day)}
      className={cn(
        "flex min-h-24 cursor-pointer flex-col gap-1 border-b border-r p-1.5 transition-colors hover:bg-muted/40",
        !inMonth && "bg-muted/20 text-muted-foreground",
      )}
    >
      <div className="flex justify-end">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs",
            isToday && "bg-primary font-semibold text-primary-foreground",
          )}
        >
          {format(day, "d")}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {visible.map((ev) => (
          <EventChip key={ev.id} event={ev} />
        ))}
        {overflow > 0 && (
          <span className="px-1 text-[11px] text-muted-foreground">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}
