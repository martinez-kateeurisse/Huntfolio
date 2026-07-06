"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/lib/database.types";
import { deleteContact } from "@/lib/actions/contacts";
import { ContactCard } from "@/components/contacts/contact-card";
import { ContactForm } from "@/components/contacts/contact-form";
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

export function ContactSection({
  applicationId,
  contacts,
}: {
  applicationId: string;
  contacts: Contact[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [, startTransition] = useTransition();

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    startTransition(async () => {
      const result = await deleteContact(target.id, applicationId);
      if (result.ok) toast.success("Contact deleted");
      else toast.error(result.error);
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Contacts
          {contacts.length > 0 && (
            <span className="ml-1.5 text-muted-foreground">
              ({contacts.length})
            </span>
          )}
        </h2>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">
          No contacts tied to this application yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              onEdit={(ct) => {
                setEditing(ct);
                setDialogOpen(true);
              }}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
          </DialogHeader>
          <ContactForm
            key={editing?.id ?? "new"}
            contact={editing}
            fixedApplicationId={applicationId}
            onDone={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">
                {deleting?.name}
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
