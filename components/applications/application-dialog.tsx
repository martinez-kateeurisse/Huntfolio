"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationForm } from "@/components/applications/application-form";
import type { Application } from "@/lib/database.types";

// Controlled dialog hosting the add/edit form. Pass `application` to edit.
export function ApplicationDialog({
  open,
  onOpenChange,
  application,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: Application | null;
}) {
  const isEdit = Boolean(application);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit application" : "New application"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this application."
              : "Track a new role you're interested in or have applied to."}
          </DialogDescription>
        </DialogHeader>
        {/* key forces a fresh form when switching between add/edit targets */}
        <ApplicationForm
          key={application?.id ?? "new"}
          application={application}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
