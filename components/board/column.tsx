"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Status } from "@/lib/constants";

export function Column({
  status,
  count,
  children,
  empty,
  headerAction,
}: {
  status: Status;
  count: number;
  children: React.ReactNode;
  empty: boolean;
  headerAction?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-1.5 flex h-6 items-center gap-2 px-1">
        <h2 className="truncate text-xs font-medium text-muted-foreground">
          {STATUS_LABELS[status]}
        </h2>
        <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
          {count}
        </span>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-1.5 rounded-lg border border-dashed border-transparent p-0.5 transition-colors",
          isOver && "border-border bg-muted/50",
        )}
      >
        {children}
        {empty && (
          <div className="grid flex-1 place-items-center rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
