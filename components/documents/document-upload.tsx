"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload, FileUp } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createDocument } from "@/lib/actions/documents";
import { IS_DEMO } from "@/lib/is-demo";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  validateDocumentFile,
  ALLOWED_DOC_EXTENSIONS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function sanitize(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function DocumentUpload() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("resume");
  const [versionLabel, setVersionLabel] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setName("");
    setType("resume");
    setVersionLabel("");
    setIsDefault(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name) {
      setName(f.name.replace(/\.[^.]+$/, "")); // strip extension
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    const validationError = validateDocumentFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    startTransition(async () => {
      const id = crypto.randomUUID();
      let fileUrl: string;

      if (IS_DEMO) {
        // No real storage in demo — record metadata only.
        fileUrl = `demo/${id}/${sanitize(file.name)}`;
      } else {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You need to be signed in.");
          return;
        }
        const path = `${user.id}/${id}/${sanitize(file.name)}`;
        const { error } = await supabase.storage
          .from("documents")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
          return;
        }
        fileUrl = path;
      }

      const result = await createDocument(
        {
          name: name.trim() || file.name,
          type: type as (typeof DOCUMENT_TYPES)[number],
          version_label: versionLabel.trim() || undefined,
          is_default: isDefault,
          file_url: fileUrl,
        },
        id,
      );

      if (result.ok) {
        toast.success("Document uploaded");
        reset();
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="size-4" /> Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            {ALLOWED_DOC_EXTENSIONS.map((e) => `.${e}`).join(", ")} · up to 10 MB.
            {IS_DEMO ? " (Demo: metadata only — no real file is stored.)" : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">File</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm hover:bg-muted/50">
              <FileUp className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {file ? file.name : "Choose a PDF, DOC, or DOCX…"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kate Martinez — Resume"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Version label
              </Label>
              <Input
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="v3 — QA-focused"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isDefault}
              onCheckedChange={(v) => setIsDefault(Boolean(v))}
            />
            Set as default for this type
          </label>

          <div className="mt-1 flex justify-end">
            <Button type="submit" disabled={isPending || !file}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Upload
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
