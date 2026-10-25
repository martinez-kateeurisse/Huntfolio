"use client";

import { useState } from "react";
import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Application, Document } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApplicationDialog } from "@/components/applications/application-dialog";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { TailorPanel } from "@/components/ai/tailor-panel";

// Detail-page actions: the two everyday ones as buttons, the rest in a menu so
// the header stays calm.
export function ApplicationActions({
  application: a,
  documents,
}: {
  application: Application;
  documents: Document[];
}) {
  const [editing, setEditing] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {a.job_url && (
        <Button variant="outline" size="sm" asChild>
          <a href={a.job_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" /> Job post
          </a>
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="size-4" /> Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTailoring(true)}>
            <Sparkles className="mr-2 size-4" /> Tailor resume with AI
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <Trash2 className="mr-2 size-4" /> Delete application
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ApplicationDialog open={editing} onOpenChange={setEditing} application={a} />
      <TailorPanel
        open={tailoring}
        onOpenChange={setTailoring}
        applicationId={a.id}
        company={a.company}
        roleTitle={a.role_title}
        defaultJobDescription={a.notes ?? ""}
        documents={documents}
      />
      <DeleteApplicationButton
        open={deleting}
        onOpenChange={setDeleting}
        id={a.id}
        company={a.company}
      />
    </div>
  );
}
