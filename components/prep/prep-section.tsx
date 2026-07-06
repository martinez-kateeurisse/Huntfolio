"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { PrepNote } from "@/lib/database.types";
import { deletePrepNote } from "@/lib/actions/prep";
import { PrepNoteCard } from "@/components/prep/prep-note-card";
import { PrepNoteForm } from "@/components/prep/prep-note-form";
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

export function PrepSection({
  applicationId,
  research,
  starStories,
}: {
  applicationId: string;
  research: PrepNote[];
  starStories: PrepNote[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrepNote | null>(null);
  const [deleting, setDeleting] = useState<PrepNote | null>(null);
  const [, startTransition] = useTransition();

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(note: PrepNote) {
    setEditing(note);
    setDialogOpen(true);
  }
  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    startTransition(async () => {
      const result = await deletePrepNote(target.id, applicationId);
      if (result.ok) toast.success("Note deleted");
      else toast.error(result.error);
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Prep</h2>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Research note
        </Button>
      </div>

      {research.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">
          No research notes for this application yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {research.map((n) => (
            <PrepNoteCard
              key={n.id}
              note={n}
              onEdit={openEdit}
              onDelete={() => setDeleting(n)}
            />
          ))}
        </div>
      )}

      {/* Read-only glance at reusable STAR stories */}
      {starStories.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5" /> Your STAR stories
            </h3>
            <Link
              href="/prep"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Manage in Prep
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {starStories.map((n) => (
              <PrepNoteCard key={n.id} note={n} readOnly />
            ))}
          </div>
        </div>
      )}

      {/* Add / edit research note */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit research note" : "New research note"}
            </DialogTitle>
          </DialogHeader>
          <PrepNoteForm
            key={editing?.id ?? "new"}
            category="research"
            note={editing}
            fixedApplicationId={applicationId}
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
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">
                {deleting?.title}
              </span>
              . This can&apos;t be undone.
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
