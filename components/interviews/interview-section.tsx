"use client";

import { useState, useTransition } from "react";
import {
  CalendarClock,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import {
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_OUTCOME_LABELS,
  type InterviewType,
  type InterviewOutcome,
} from "@/lib/constants";
import type { Interview } from "@/lib/database.types";
import { deleteInterview } from "@/lib/actions/interviews";
import { updateApplicationStatus } from "@/lib/actions/applications";
import { InterviewForm } from "@/components/interviews/interview-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const OUTCOME_CLASS: Record<InterviewOutcome, string> = {
  pending: "bg-muted text-muted-foreground",
  passed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function isUrl(v: string | null): v is string {
  return !!v && /^https?:\/\//i.test(v);
}

export function InterviewSection({
  applicationId,
  applicationStatus,
  interviews,
}: {
  applicationId: string;
  applicationStatus: string;
  interviews: Interview[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [deleting, setDeleting] = useState<Interview | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(iv: Interview) {
    setEditing(iv);
    setDialogOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    startTransition(async () => {
      const result = await deleteInterview(target.id, applicationId);
      if (!result.ok) toast.error(result.error);
      else toast.success("Interview deleted");
    });
  }

  function moveToOffer() {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, "offer");
      if (result.ok) toast.success("Moved to Offer");
      else toast.error(result.error);
    });
  }

  const canNudgeToOffer =
    applicationStatus !== "offer" && applicationStatus !== "closed";

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Interviews
          {interviews.length > 0 && (
            <span className="ml-1.5 text-muted-foreground">
              ({interviews.length})
            </span>
          )}
        </h2>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {interviews.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No interviews scheduled yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {interviews.map((iv) => {
            const outcome = (iv.outcome ?? "pending") as InterviewOutcome;
            return (
              <li key={iv.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {iv.type
                          ? INTERVIEW_TYPE_LABELS[iv.type as InterviewType]
                          : "Interview"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium leading-none",
                          OUTCOME_CLASS[outcome],
                        )}
                      >
                        {INTERVIEW_OUTCOME_LABELS[outcome]}
                      </span>
                    </div>
                    {iv.scheduled_at && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        {formatDateTime(iv.scheduled_at)}
                      </p>
                    )}
                    {iv.location && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        {isUrl(iv.location) ? (
                          <a
                            href={iv.location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-foreground hover:underline"
                          >
                            {iv.location}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          iv.location
                        )}
                      </p>
                    )}
                    {iv.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {iv.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(iv)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Edit interview"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleting(iv)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Delete interview"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {outcome === "passed" && canNudgeToOffer && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/50">
                    <span className="text-emerald-700 dark:text-emerald-300">
                      Passed — move this application to Offer?
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={moveToOffer}
                      disabled={isPending}
                      className="shrink-0"
                    >
                      Move to Offer <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit interview" : "Add interview"}
            </DialogTitle>
          </DialogHeader>
          <InterviewForm
            key={editing?.id ?? "new"}
            applicationId={applicationId}
            interview={editing}
            onDone={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete interview?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this interview. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
