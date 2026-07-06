"use client";

import { useState } from "react";
import { Building2, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrepNote } from "@/lib/database.types";

// A single prep note. Content preserves line breaks (whitespace-pre-wrap).
// Long notes collapse to a few lines with a "Show more" toggle.
export function PrepNoteCard({
  note,
  company,
  onEdit,
  onDelete,
  readOnly = false,
  collapsible = true,
}: {
  note: PrepNote;
  company?: string | null;
  onEdit?: (note: PrepNote) => void;
  onDelete?: (note: PrepNote) => void;
  readOnly?: boolean;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(!collapsible);
  const content = note.content ?? "";
  const isLong = content.length > 240 || content.split("\n").length > 6;

  return (
    <div className="group rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{note.title}</p>
          {company && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="size-3" />
              {company}
            </p>
          )}
        </div>
        {!readOnly && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={() => onEdit?.(note)}
              aria-label="Edit note"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={() => onDelete?.(note)}
              aria-label="Delete note"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {content && (
        <>
          <p
            className={cn(
              "mt-2 whitespace-pre-wrap text-sm text-muted-foreground",
              collapsible && !expanded && isLong && "line-clamp-4",
            )}
          >
            {content}
          </p>
          {collapsible && isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={cn("size-3 transition-transform", expanded && "rotate-180")}
              />
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
