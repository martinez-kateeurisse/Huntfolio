"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { dueLabel } from "@/lib/format";
import { toggleTask, deleteTask } from "@/lib/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task } from "@/lib/database.types";

export type TaskItemData = Task & {
  application?: { id: string; company: string } | null;
};

export function TaskItem({
  task,
  showApplication = false,
}: {
  task: TaskItemData;
  showApplication?: boolean;
}) {
  const [done, setDone] = useState(task.status === "done");
  const [, startTransition] = useTransition();
  const due = dueLabel(task.due_date);

  function onToggle(next: boolean) {
    setDone(next);
    startTransition(async () => {
      const result = await toggleTask(task.id, next);
      if (!result.ok) {
        setDone(!next);
        toast.error(result.error);
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
      <Checkbox
        checked={done}
        onCheckedChange={(v) => onToggle(Boolean(v))}
        className="mt-0.5"
        aria-label={done ? "Mark as not done" : "Mark as done"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {due && !done && (
            <span
              className={cn(
                "text-xs",
                due.overdue
                  ? "text-destructive"
                  : due.soon
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
              )}
            >
              {due.label}
            </span>
          )}
          {showApplication && task.application && (
            <Link
              href={`/applications/${task.application.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              <Building2 className="size-3" />
              {task.application.company}
            </Link>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete task"
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
