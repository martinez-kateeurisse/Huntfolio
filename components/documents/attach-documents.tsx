"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FileText, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/constants";
import type { Document } from "@/lib/database.types";
import { attachDocument, detachDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AttachDocuments({
  applicationId,
  attached,
  allDocuments,
}: {
  applicationId: string;
  attached: Document[];
  allDocuments: Document[];
}) {
  const [isPending, startTransition] = useTransition();
  const attachedIds = new Set(attached.map((d) => d.id));
  const available = allDocuments.filter((d) => !attachedIds.has(d.id));

  function attach(documentId: string) {
    startTransition(async () => {
      const result = await attachDocument(applicationId, documentId);
      if (!result.ok) toast.error(result.error);
    });
  }

  function detach(documentId: string) {
    startTransition(async () => {
      const result = await detachDocument(applicationId, documentId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Documents used</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={available.length === 0 || isPending}
            >
              <Plus className="size-4" /> Attach
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 w-64 overflow-y-auto">
            <DropdownMenuLabel className="text-muted-foreground">
              Attach from library
            </DropdownMenuLabel>
            {available.map((d) => (
              <DropdownMenuItem key={d.id} onClick={() => attach(d.id)}>
                <FileText className="mr-2 size-4 shrink-0" />
                <span className="truncate">
                  {d.name}
                  {d.version_label ? ` · ${d.version_label}` : ""}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {attached.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">
          {allDocuments.length === 0 ? (
            <>
              No documents in your library yet.{" "}
              <Link href="/documents" className="text-foreground hover:underline">
                Upload one
              </Link>{" "}
              to attach it here.
            </>
          ) : (
            "No documents attached to this application yet."
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attached.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-lg border p-2.5"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.type ? DOCUMENT_TYPE_LABELS[d.type as DocumentType] : ""}
                  {d.version_label ? ` · ${d.version_label}` : ""}
                </p>
              </div>
              <button
                onClick={() => detach(d.id)}
                disabled={isPending}
                aria-label="Detach document"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
