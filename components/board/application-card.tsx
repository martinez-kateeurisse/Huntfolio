"use client";

import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  Clock,
  Eye,
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
import { Checkbox } from "@/components/ui/checkbox";
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
  // Priority: scheduled interview > next task due > employer viewed it
  // (while still waiting at Applied) > days since applied.
  if (app.nextInterviewAt) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] text-amber-600 dark:text-amber-400">
        <CalendarClock className="size-3 shrink-0" />
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
            "inline-flex min-w-0 items-center gap-1 truncate text-[11px]",
            d.overdue
              ? "text-destructive"
              : d.soon
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
          )}
        >
          <ListChecks className="size-3 shrink-0" />
          {d.label}
        </span>
      );
    }
  }
  if (app.viewedAt && (app.status === "applied" || app.status === "no_response")) {
    const n = daysSince(app.viewedAt);
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400">
        <Eye className="size-3 shrink-0" />
        {n === 0 ? "Viewed today" : `Viewed ${n}d ago`}
      </span>
    );
  }
  if (app.date_applied && APPLIED_OR_BEYOND.includes(app.status as Status)) {
    const n = daysSince(app.date_applied);
    if (n != null) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3 shrink-0" />
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
  selecting = false,
  selected = false,
  onToggleSelect,
  dimmed = false,
  overlay = false,
}: {
  app: ApplicationWithSignals;
  onEdit?: (app: ApplicationWithSignals) => void;
  onDelete?: (app: ApplicationWithSignals) => void;
  onMove?: (app: ApplicationWithSignals, status: Status) => void;
  // Multi-select: when `selecting`, a click toggles the card instead of
  // opening it. Ctrl/⌘/Shift-click starts a selection from anywhere.
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (app: ApplicationWithSignals) => void;
  dimmed?: boolean;
  overlay?: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id, disabled: overlay });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  function handleClick(e: React.MouseEvent) {
    if (overlay) return;
    if (selecting || e.metaKey || e.ctrlKey || e.shiftKey) {
      onToggleSelect?.(app);
      return;
    }
    router.push(`/applications/${app.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "group rounded-md border bg-card px-2.5 py-2 text-left shadow-xs transition-shadow",
        "cursor-grab active:cursor-grabbing hover:shadow-sm",
        STATUS_ACCENT[app.status as Status],
        selected && "ring-2 ring-primary/60",
        (isDragging || dimmed) && "opacity-40",
        overlay && "rotate-1 cursor-grabbing shadow-md",
      )}
    >
      <div className="flex items-start gap-2">
        {selecting && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.(app)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Select ${app.company}`}
            className="mt-0.5"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug">
            {app.company}
          </p>
          <p className="truncate text-xs leading-snug text-muted-foreground">
            {app.role_title}
          </p>
        </div>
        {!selecting && !overlay && (
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                // Hover-revealed on desktop; always visible on touch screens,
                // which have no hover to reveal it.
                className="-mr-1 -mt-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
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
        )}
      </div>

      {(app.track || app.nextInterviewAt || app.nextTaskDue || app.viewedAt || app.date_applied) && (
        <div
          className={cn(
            "mt-1.5 flex min-w-0 items-center gap-1.5",
            selecting && "pl-6",
          )}
        >
          <TrackPill track={app.track} className="px-1.5 py-px text-[10px]" />
          <Signal app={app} />
        </div>
      )}
    </div>
  );
}
