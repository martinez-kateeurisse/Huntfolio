"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTask } from "@/lib/actions/tasks";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNLINKED = "__none__";

// Compact inline task creator. When `applicationId` is given the task is fixed
// to that application; otherwise an optional application picker is shown.
export function QuickAddTask({
  applicationId,
  applications,
}: {
  applicationId?: string;
  applications?: { id: string; company: string }[];
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [linkedApp, setLinkedApp] = useState(UNLINKED);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createTask({
        title,
        due_date: dueDate || undefined,
        priority: priority as (typeof PRIORITIES)[number],
        application_id: applicationId ?? (linkedApp === UNLINKED ? "" : linkedApp),
      });
      if (result.ok) {
        setTitle("");
        setDueDate("");
        setPriority("medium");
        setLinkedApp(UNLINKED);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="h-9 min-w-40 flex-1"
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="h-9 w-auto"
        aria-label="Due date"
      />
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="h-9 w-28" aria-label="Priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!applicationId && applications && applications.length > 0 && (
        <Select value={linkedApp} onValueChange={setLinkedApp}>
          <SelectTrigger className="h-9 w-40" aria-label="Link to application">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNLINKED}>No application</SelectItem>
            {applications.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="submit" size="sm" disabled={isPending || !title.trim()}>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Add
      </Button>
    </form>
  );
}
