"use client";

import { useState, useTransition } from "react";
import {
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  setDefaultDocument,
  getDocumentDownloadUrl,
} from "@/lib/actions/documents";
import type { Document } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { DocumentPreviewDialog } from "@/components/documents/document-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DocumentItem({
  doc,
  onRequestDelete,
}: {
  doc: Document;
  onRequestDelete: (doc: Document) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);

  function download() {
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(doc.id);
      if (result.ok && result.data) {
        window.open(result.data.url, "_blank");
      } else {
        toast.error(result.ok ? "No file available." : result.error);
      }
    });
  }

  function makeDefault() {
    startTransition(async () => {
      const result = await setDefaultDocument(doc.id);
      if (result.ok) toast.success("Set as default");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        title="Preview"
        className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/15 hover:text-foreground"
      >
        <FileText className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium hover:underline">
            {doc.name}
          </span>
          {doc.is_default && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium leading-none text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Star className="size-2.5 fill-current" /> Default
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {doc.version_label ? `${doc.version_label} · ` : ""}
          {formatDate(doc.created_at)}
        </p>
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setPreviewOpen(true)}
        aria-label="Preview"
        className="shrink-0"
      >
        <Eye className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={download}
        disabled={isPending}
        aria-label="Download"
        className="shrink-0"
      >
        <Download className={cn("size-4", isPending && "animate-pulse")} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Document actions"
            className="shrink-0"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 size-4" /> Preview
          </DropdownMenuItem>
          {!doc.is_default && (
            <DropdownMenuItem onClick={makeDefault}>
              <Star className="mr-2 size-4" /> Set as default
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={download}>
            <Download className="mr-2 size-4" /> Download
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onRequestDelete(doc)}
          >
            <Trash2 className="mr-2 size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DocumentPreviewDialog
        doc={doc}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
