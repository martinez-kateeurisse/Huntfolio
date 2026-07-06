"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PrepNoteFormValues } from "@/lib/schemas";
import { createPrepNote, updatePrepNote } from "@/lib/actions/prep";
import type { PrepCategory } from "@/lib/constants";
import type { PrepNote } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNLINKED = "__none__";

export function PrepNoteForm({
  category,
  note,
  applications,
  fixedApplicationId,
  onDone,
}: {
  category: PrepCategory;
  note?: PrepNote | null;
  applications?: { id: string; company: string }[];
  fixedApplicationId?: string;
  onDone?: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [appId, setAppId] = useState(
    fixedApplicationId ?? note?.application_id ?? UNLINKED,
  );
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(note);

  // Research notes are meant to be tied to an application; questions/star can be.
  const showAppPicker =
    !fixedApplicationId && applications && applications.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give it a title.");
      return;
    }
    const values: PrepNoteFormValues = {
      category,
      title,
      content: content || undefined,
      application_id: fixedApplicationId ?? (appId === UNLINKED ? "" : appId),
    };
    startTransition(async () => {
      const result = isEdit
        ? await updatePrepNote(note!.id, values)
        : await createPrepNote(values);
      if (result.ok) {
        toast.success(isEdit ? "Note saved" : "Note added");
        onDone?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            category === "star"
              ? "e.g. Led a migration under deadline"
              : category === "questions"
                ? "e.g. Questions to ask them"
                : "e.g. Company research"
          }
          autoFocus
        />
      </div>

      {showAppPicker && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Application {category === "research" ? "" : "(optional)"}
          </Label>
          <Select value={appId} onValueChange={setAppId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Link to an application" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNLINKED}>No application</SelectItem>
              {applications!.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder={
            category === "star"
              ? "Situation…\nTask…\nAction…\nResult…"
              : "Write freely — line breaks are preserved."
          }
          className="font-mono text-sm leading-relaxed"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
