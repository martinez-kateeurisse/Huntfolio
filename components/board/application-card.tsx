"use client";

import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  Clock,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrackPill } from "@/components/track-pill";
import { daysSince, dueLabel, formatDateTime } from "@/lib/format";
import {
  PIPELINE,
  STATUS_LABELS,
  APPLIED_OR_BEYOND,
  type Status,
} from "@/lib/constants";
import type { ApplicationWithSignals } from "@/lib/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_ACCENT: Partial<Record<Status, string>> = {
  interview: "border-l-2 border-l-amber-400 dark:border-l-amber-500",
  offer: "border-l-2 border-l-emerald-500",
};

function Signal({ app }: { app: ApplicationWithSignals }) {
  // Priority: scheduled interview > next task due > days since applied.
  if (app.nextInterviewAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <CalendarClock className="size-3" />
        {formatDateTime(app.nextInterviewAt)}
      </span>
    );
  }
  if (app.nextTaskDue) {
    const d = dueLabel(app.nextTaskDue);
    if (d) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            d.overdue
              ? "text-destructive"
              : d.soon
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
          )}
        >
          <ListChecks className="size-3" />
          {d.label}
        </span>
      );
    }
  }
  if (app.date_applied && APPLIED_OR_BEYOND.includes(app.status as Status)) {
    const n = daysSince(app.date_applied);
    if (n != null) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {n === 0 ? "Applied today" : `${n}d since applied`}
        </span>
      );
    }
  }
  return null;
}

export function ApplicationCard({
  app,
  onEdit,
  onDelete,
  onMove,
  overlay = false,
}: {
  app: ApplicationWithSignals;
  onEdit?: (app: ApplicationWithSignals) => void;
  onDelete?: (app: ApplicationWithSignals) => void;
  onMove?: (app: ApplicationWithSignals, status: Status) => void;
  overlay?: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id, disabled: overlay });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !overlay && router.push(`/applications/${app.id}`)}
      className={cn(
        "group rounded-lg border bg-card p-3 text-left shadow-xs transition-shadow",
        "cursor-grab active:cursor-grabbing hover:shadow-sm",
        STATUS_ACCENT[app.status as Status],
        isDragging && "opacity-40",
        overlay && "rotate-1 cursor-grabbing shadow-md",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <TrackPill track={app.track} />
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="-mr-1 -mt-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus:opacity-100"
              aria-label="Card actions"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={() => router.push(`/applications/${app.id}`)}
            >
              <ExternalLink className="mr-2 size-4" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(app)}>
              <Pencil className="mr-2 size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {PIPELINE.filter((s) => s !== app.status).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onMove?.(app, s)}>
                    {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete?.(app)}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="font-semibold leading-tight">{app.company}</p>
      <p className="mt-0.5 text-sm text-muted-foreground leading-tight">
        {app.role_title}
      </p>

      <div className="mt-2 min-h-4">
        <Signal app={app} />
      </div>
    </div>
  );
}
