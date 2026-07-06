"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  PREP_CATEGORY_LABELS,
  PREP_CATEGORY_HINTS,
  type PrepCategory,
} from "@/lib/constants";
import type { PrepNote } from "@/lib/database.types";
import type { PrepNoteWithApplication } from "@/lib/queries";
import { deletePrepNote } from "@/lib/actions/prep";
import { PrepNoteCard } from "@/components/prep/prep-note-card";
import { PrepNoteForm } from "@/components/prep/prep-note-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function PrepBoard({
  notes,
  applications,
}: {
  notes: PrepNoteWithApplication[];
  applications: { id: string; company: string }[];
}) {
  const [dialog, setDialog] = useState<{
    category: PrepCategory;
    note: PrepNote | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<PrepNoteWithApplication | null>(null);
  const [, startTransition] = useTransition();

  const research = notes.filter((n) => n.category === "research");
  const questions = notes.filter((n) => n.category === "questions");
  const star = notes.filter((n) => n.category === "star");

  function openAdd(category: PrepCategory) {
    setDialog({ category, note: null });
  }
  function openEdit(note: PrepNote) {
    setDialog({ category: note.category as PrepCategory, note });
  }
  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    startTransition(async () => {
      const result = await deletePrepNote(target.id, target.application_id);
      if (result.ok) toast.success("Note deleted");
      else toast.error(result.error);
    });
  }

  // Group research notes by application.
  const researchGroups = new Map<
    string,
    { company: string; notes: PrepNoteWithApplication[] }
  >();
  const unlinkedResearch: PrepNoteWithApplication[] = [];
  for (const n of research) {
    if (n.application_id) {
      const key = n.application_id;
      if (!researchGroups.has(key)) {
        researchGroups.set(key, {
          company: n.application?.company ?? "Application",
          notes: [],
        });
      }
      researchGroups.get(key)!.notes.push(n);
    } else {
      unlinkedResearch.push(n);
    }
  }

  return (
    <Tabs defaultValue="research" className="w-full">
      <TabsList>
        <TabsTrigger value="research">
          {PREP_CATEGORY_LABELS.research}
          <Count n={research.length} />
        </TabsTrigger>
        <TabsTrigger value="questions">
          {PREP_CATEGORY_LABELS.questions}
          <Count n={questions.length} />
        </TabsTrigger>
        <TabsTrigger value="star">
          {PREP_CATEGORY_LABELS.star}
          <Count n={star.length} />
        </TabsTrigger>
      </TabsList>

      {/* Research — grouped by application */}
      <TabsContent value="research" className="mt-4 flex flex-col gap-5">
        <Header
          hint={PREP_CATEGORY_HINTS.research}
          onAdd={() => openAdd("research")}
        />
        {research.length === 0 ? (
          <Empty text="No research notes yet. Add notes about a company or role and link them to the application." />
        ) : (
          <>
            {[...researchGroups.entries()].map(([appId, group]) => (
              <section key={appId} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {group.company}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.notes.map((n) => (
                    <PrepNoteCard
                      key={n.id}
                      note={n}
                      onEdit={openEdit}
                      onDelete={() => setDeleting(n)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {unlinkedResearch.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Unlinked
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {unlinkedResearch.map((n) => (
                    <PrepNoteCard
                      key={n.id}
                      note={n}
                      onEdit={openEdit}
                      onDelete={() => setDeleting(n)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </TabsContent>

      {/* Questions — reusable library */}
      <TabsContent value="questions" className="mt-4 flex flex-col gap-4">
        <Header
          hint={PREP_CATEGORY_HINTS.questions}
          onAdd={() => openAdd("questions")}
        />
        {questions.length === 0 ? (
          <Empty text="Build a reusable bank of questions — ones you might be asked, and ones you want to ask them." />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {questions.map((n) => (
              <PrepNoteCard
                key={n.id}
                note={n}
                company={n.application?.company}
                onEdit={openEdit}
                onDelete={() => setDeleting(n)}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* STAR — reusable stories */}
      <TabsContent value="star" className="mt-4 flex flex-col gap-4">
        <Header hint={PREP_CATEGORY_HINTS.star} onAdd={() => openAdd("star")} />
        {star.length === 0 ? (
          <Empty text="Write reusable STAR stories (Situation–Task–Action–Result) you can pull from in any interview." />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {star.map((n) => (
              <PrepNoteCard
                key={n.id}
                note={n}
                onEdit={openEdit}
                onDelete={() => setDeleting(n)}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Add / edit dialog */}
      <Dialog open={Boolean(dialog)} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog?.note ? "Edit note" : "New note"} ·{" "}
              {dialog ? PREP_CATEGORY_LABELS[dialog.category] : ""}
            </DialogTitle>
            <DialogDescription>
              {dialog ? PREP_CATEGORY_HINTS[dialog.category] : ""}
            </DialogDescription>
          </DialogHeader>
          {dialog && (
            <PrepNoteForm
              key={dialog.note?.id ?? "new"}
              category={dialog.category}
              note={dialog.note}
              applications={applications}
              onDone={() => setDialog(null)}
            />
          )}
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
    </Tabs>
  );
}

function Count({ n }: { n: number }) {
  if (n === 0) return null;
  return <span className="ml-1.5 text-xs text-muted-foreground">{n}</span>;
}

function Header({ hint, onAdd }: { hint: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{hint}</p>
      <Button size="sm" onClick={onAdd} className="shrink-0">
        <Plus className="size-4" /> Add
      </Button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
