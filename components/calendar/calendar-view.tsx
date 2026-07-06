"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/queries";
import type { Interview } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonthGrid } from "@/components/calendar/month-grid";
import { AgendaList } from "@/components/calendar/agenda-list";
import { EventRow } from "@/components/calendar/event-row";
import { InterviewForm } from "@/components/interviews/interview-form";

export function CalendarView({
  events,
  monthISO,
  monthLabel,
  prevHref,
  nextHref,
  todayHref,
}: {
  events: CalendarEvent[];
  monthISO: string;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Interview | null>(null);

  const dayEvents = selectedDay
    ? events
        .filter(
          (e) =>
            format(new Date(e.date), "yyyy-MM-dd") ===
            format(selectedDay, "yyyy-MM-dd"),
        )
        .sort((a, b) => (a.date < b.date ? -1 : 1))
    : [];

  function openInterview(iv: Interview) {
    setSelectedDay(null);
    setEditing(iv);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild aria-label="Previous month">
            <Link href={prevHref}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild aria-label="Next month">
            <Link href={nextHref}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="ml-1">
            <Link href={todayHref}>Today</Link>
          </Button>
          <h1 className="ml-2 text-lg font-semibold">{monthLabel}</h1>
        </div>

        <div className="flex items-center rounded-lg border p-0.5">
          <button
            onClick={() => setView("month")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm",
              view === "month"
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="size-4" /> Month
          </button>
          <button
            onClick={() => setView("agenda")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm",
              view === "agenda"
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-4" /> Agenda
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-400" /> Interview
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-sky-400" /> Task
        </span>
      </div>

      {view === "month" ? (
        <div className="flex flex-col gap-2">
          <MonthGrid
            monthISO={monthISO}
            events={events}
            onDayOpen={setSelectedDay}
          />
          {events.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No interviews or tasks scheduled this month.
            </p>
          )}
        </div>
      ) : (
        <AgendaList events={events} onEditInterview={openInterview} />
      )}

      {/* Day detail panel */}
      <Dialog
        open={Boolean(selectedDay)}
        onOpenChange={(o) => !o && setSelectedDay(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? format(selectedDay, "EEEE, MMMM d") : ""}
            </DialogTitle>
          </DialogHeader>
          {dayEvents.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nothing scheduled this day.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {dayEvents.map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  onEditInterview={openInterview}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Interview edit */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit interview</DialogTitle>
          </DialogHeader>
          {editing && (
            <InterviewForm
              key={editing.id}
              applicationId={editing.application_id}
              interview={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
