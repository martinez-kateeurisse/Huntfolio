"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/constants";
import type { Document } from "@/lib/database.types";
import { deleteDocument } from "@/lib/actions/documents";
import { DocumentItem } from "@/components/documents/document-item";
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

export function DocumentLibrary({ documents }: { documents: Document[] }) {
  const [deleting, setDeleting] = useState<Document | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    startTransition(async () => {
      const result = await deleteDocument(target.id);
      if (result.ok) toast.success("Document deleted");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {DOCUMENT_TYPES.map((type) => {
        const docs = documents.filter((d) => d.type === type);
        if (docs.length === 0) return null;
        return (
          <section key={type} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {DOCUMENT_TYPE_LABELS[type as DocumentType]}
              <span className="ml-1.5 opacity-70">{docs.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {docs.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  onRequestDelete={setDeleting}
                />
              ))}
            </div>
          </section>
        );
      })}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">
                {deleting?.name}
              </span>{" "}
              and its file. Any applications it was attached to will lose the
              link. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
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
