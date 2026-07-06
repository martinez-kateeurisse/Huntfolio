"use client";

import Link from "next/link";
import { Building2, Link2, Mail, Pencil, Trash2 } from "lucide-react";
import type { Contact } from "@/lib/database.types";

export function ContactCard({
  contact,
  applicationCompany,
  applicationId,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  applicationCompany?: string | null;
  applicationId?: string | null;
  onEdit: (c: Contact) => void;
  onDelete: (c: Contact) => void;
}) {
  const initials = contact.name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="group flex gap-3 rounded-lg border bg-card p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{contact.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[contact.role, contact.company].filter(Boolean).join(" · ") ||
                "—"}
            </p>
          </div>
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={() => onEdit(contact)}
              aria-label="Edit contact"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={() => onDelete(contact)}
              aria-label="Delete contact"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
            >
              <Mail className="size-3" /> {contact.email}
            </a>
          )}
          {contact.linkedin && (
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
            >
              <Link2 className="size-3" /> LinkedIn
            </a>
          )}
          {applicationCompany && applicationId && (
            <Link
              href={`/applications/${applicationId}`}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
            >
              <Building2 className="size-3" /> {applicationCompany}
            </Link>
          )}
        </div>

        {contact.notes && (
          <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">
            {contact.notes}
          </p>
        )}
      </div>
    </div>
  );
}
