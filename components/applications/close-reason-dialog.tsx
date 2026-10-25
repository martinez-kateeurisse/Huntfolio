"use client";

import { useState } from "react";
import {
  CLOSE_REASONS,
  CLOSE_REASON_LABELS,
  type CloseReason,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Asks why an application is being closed. Shared by the board (drag/move to
// Closed) and the status picker on the detail page.
export function CloseReasonDialog({
  company,
  open,
  onCancel,
  onConfirm,
}: {
  company: string | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: CloseReason) => void;
}) {
  const [reason, setReason] = useState<CloseReason>("rejected");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Close this application</DialogTitle>
          <DialogDescription>
            Why are you closing{" "}
            <span className="font-medium text-foreground">{company}</span>?
          </DialogDescription>
        </DialogHeader>
        <Select value={reason} onValueChange={(v) => setReason(v as CloseReason)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLOSE_REASONS.map((r) => (
              <SelectItem key={r} value={r}>
                {CLOSE_REASON_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(reason)}>Close application</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
