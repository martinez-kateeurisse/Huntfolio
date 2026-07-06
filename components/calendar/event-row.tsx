"use client";

import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTERVIEW_TYPE_LABELS,
  type InterviewType,
} from "@/lib/constants";
import type { CalendarEvent } from "@/lib/queries";
import type { Interview } from "@/lib/database.types";
import { TaskItem } from "@/components/tasks/task-item";
import { EVENT_COLORS } from "@/components/calendar/event-chip";

export function EventRow({
  event,
  onEditInterview,
}: {
  event: CalendarEvent;
  onEditInterview: (interview: Interview) => void;
}) {
  if (event.kind === "task" && event.task) {
    return (
      <TaskItem
        task={{
          ...event.task,
          application: event.applicationId
            ? { id: event.applicationId, company: event.company ?? "" }
            : null,
        }}
        showApplication
      />
    );
  }

  const iv = event.interview;
  if (!iv) return null;
  const time = format(new Date(event.date), "h:mma").toLowerCase();

  return (
    <button
      type="button"
      onClick={() => onEditInterview(iv)}
      className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-muted/50"
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md",
          EVENT_COLORS.interview,
        )}
      >
        <CalendarClock className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {event.company ?? "Interview"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {iv.type ? INTERVIEW_TYPE_LABELS[iv.type as InterviewType] : "Interview"}{" "}
          · {time}
        </p>
      </div>
    </button>
  );
}
