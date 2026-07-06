"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getDocumentPreviewUrl,
  getDocumentDownloadUrl,
} from "@/lib/actions/documents";
import type { Document } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function extensionOf(doc: Document) {
  // The stored path keeps the original extension; the display name doesn't.
  const source = doc.file_url ?? doc.name ?? "";
  const match = /\.([a-z0-9]+)$/i.exec(source);
  return match ? match[1].toLowerCase() : "";
}

export function DocumentPreviewDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ext = extensionOf(doc);
  const canInline = ext === "pdf";
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, startDownload] = useTransition();

  useEffect(() => {
    if (!open || !canInline) return;
    let active = true;
    setLoading(true);
    setError(null);
    setUrl(null);
    getDocumentPreviewUrl(doc.id).then((result) => {
      if (!active) return;
      if (result.ok && result.data) setUrl(result.data.url);
      else setError(result.ok ? "No preview available." : result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [open, canInline, doc.id]);

  function download() {
    startDownload(async () => {
      const result = await getDocumentDownloadUrl(doc.id);
      if (result.ok && result.data) window.open(result.data.url, "_blank");
      else toast.error(result.ok ? "No file available." : result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{doc.name}</DialogTitle>
          <DialogDescription>
            {doc.version_label ? `${doc.version_label} · ` : ""}
            {ext ? ext.toUpperCase() : "File"}
          </DialogDescription>
        </DialogHeader>

        {canInline ? (
          <div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-md border bg-muted/30">
            {loading && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Loading preview…
                </span>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
                {error}
              </div>
            )}
            {url && !error && (
              <iframe
                src={url}
                title={`Preview of ${doc.name}`}
                className="size-full min-h-[60vh]"
              />
            )}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center">
            <div className="grid size-12 place-items-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              Inline preview isn&apos;t available for{" "}
              {ext ? ext.toUpperCase() : "this file type"}. Download it to view.
            </p>
            <Button onClick={download} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
