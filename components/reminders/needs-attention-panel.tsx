"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Nudge, NudgeKind } from "@/lib/reminders";
import { toggleTask, createTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";

const ICONS: Record<NudgeKind, React.ElementType> = {
  interview_soon: CalendarClock,
  overdue_task: ListChecks,
  follow_up: Send,
  stale: Clock,
};

const ICON_TONE: Record<NudgeKind, string> = {
  interview_soon: "text-amber-600 dark:text-amber-400",
  overdue_task: "text-destructive",
  follow_up: "text-sky-600 dark:text-sky-400",
  stale: "text-muted-foreground",
};

export function NeedsAttentionPanel({
  nudges,
  title = "Needs attention",
  emptyText = "You're all caught up — nothing needs attention.",
  limit = 5,
}: {
  nudges: Nudge[];
  title?: string;
  emptyText?: string;
  limit?: number;
}) {
  // Long lists bury the point; show the most urgent few and let the rest
  // expand on demand.
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? nudges : nudges.slice(0, limit);
  const hidden = nudges.length - visible.length;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <AlarmClock className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">{title}</h2>
        {nudges.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
            {nudges.length}
          </span>
        )}
      </div>
      {nudges.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-500" />
          {emptyText}
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y">
            {visible.map((n) => (
              <NudgeRow key={n.id} nudge={n} />
            ))}
          </ul>
          {nudges.length > limit && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showAll ? "Show less" : `Show ${hidden} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function NudgeRow({ nudge }: { nudge: Nudge }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const Icon = ICONS[nudge.kind];

  function open() {
    if (nudge.applicationId) router.push(`/applications/${nudge.applicationId}`);
  }

  function completeTask() {
    if (!nudge.taskId) return;
    setDone(true);
    startTransition(async () => {
      const result = await toggleTask(nudge.taskId!, true);
      if (!result.ok) {
        setDone(false);
        toast.error(result.error);
      } else {
        toast.success("Task completed");
      }
    });
  }

  function addFollowUp() {
    if (!nudge.applicationId) return;
    startTransition(async () => {
      // Two days out, all-day (local midnight) — no particular time implied.
      const due = new Date(Date.now() + 2 * 86_400_000);
      due.setHours(0, 0, 0, 0);
      const result = await createTask({
        title: nudge.title, // "Follow up with {company}"
        due_date: due.toISOString(),
        priority: "medium",
        application_id: nudge.applicationId!,
      });
      if (result.ok) toast.success("Follow-up task added");
      else toast.error(result.error);
    });
  }

  return (
    <li className={cn("flex items-center gap-3 py-2.5", done && "opacity-50")}>
      <Icon className={cn("size-4 shrink-0", ICON_TONE[nudge.kind])} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{nudge.title}</p>
        {nudge.subtitle && (
          <p className="truncate text-xs text-muted-foreground">
            {nudge.subtitle}
          </p>
        )}
      </div>
      <div className="shrink-0">
        {nudge.kind === "overdue_task" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={completeTask}
            disabled={isPending || done}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Complete
          </Button>
        ) : nudge.kind === "follow_up" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={addFollowUp}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Add task
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={open}>
            Open
          </Button>
        )}
      </div>
    </li>
  );
}
