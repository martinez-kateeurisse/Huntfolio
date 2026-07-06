"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Status } from "@/lib/constants";

export function Column({
  status,
  count,
  children,
  empty,
}: {
  status: Status;
  count: number;
  children: React.ReactNode;
  empty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <h2 className="text-sm font-medium">{STATUS_LABELS[status]}</h2>
        <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-xl border border-dashed border-transparent p-1 transition-colors",
          isOver && "border-border bg-muted/50",
        )}
      >
        {children}
        {empty && (
          <div className="grid flex-1 place-items-center rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
