"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/database.types";
import type { ContactWithApplication } from "@/lib/queries";
import { deleteContact } from "@/lib/actions/contacts";
import { ContactCard } from "@/components/contacts/contact-card";
import { ContactForm } from "@/components/contacts/contact-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
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

export function ContactList({
  contacts,
  applications,
}: {
  contacts: ContactWithApplication[];
  applications: { id: string; company: string }[];
}) {
  const [query, setQuery] = useState("");
  const [grouped, setGrouped] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q),
    );
  }, [contacts, query]);

  const groups = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, ContactWithApplication[]>();
    for (const c of filtered) {
      const key = c.company?.trim() || "No company";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, grouped]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Contact) {
    setEditing(c);
    setDialogOpen(true);
  }
  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    startTransition(async () => {
      const result = await deleteContact(target.id, target.application_id);
      if (result.ok) toast.success("Contact deleted");
      else toast.error(result.error);
    });
  }

  const cardProps = (c: ContactWithApplication) => ({
    contact: c,
    applicationCompany: c.application?.company,
    applicationId: c.application?.id,
    onEdit: openEdit,
    onDelete: setDeleting,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Contacts</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No contacts yet"
          description="Keep track of recruiters and referrers — who you spoke to, where, and how to reach them. Link them to applications for context."
          actionLabel="Add your first contact"
          onAction={openAdd}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or company…"
                className="h-9 pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGrouped((v) => !v)}
              className={cn(grouped && "bg-muted")}
            >
              Group by company
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No contacts match “{query}”.
            </p>
          ) : groups ? (
            <div className="flex flex-col gap-5">
              {groups.map(([company, list]) => (
                <section key={company} className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {company}
                    <span className="ml-1.5 opacity-70">{list.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {list.map((c) => (
                      <ContactCard key={c.id} {...cardProps(c)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {filtered.map((c) => (
                <ContactCard key={c.id} {...cardProps(c)} />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
          </DialogHeader>
          <ContactForm
            key={editing?.id ?? "new"}
            contact={editing}
            applications={applications}
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
