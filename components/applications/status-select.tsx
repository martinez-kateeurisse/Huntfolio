"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/constants";
import { updateApplicationStatus } from "@/lib/actions/applications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CloseReasonDialog } from "@/components/applications/close-reason-dialog";

// Change status right from the detail header, without opening the edit form.
// Moving to Closed asks for a reason, same as on the board.
export function StatusSelect({
  applicationId,
  company,
  status,
}: {
  applicationId: string;
  company: string;
  status: Status;
}) {
  const [value, setValue] = useState<Status>(status);
  const [syncedFrom, setSyncedFrom] = useState(status);
  const [askReason, setAskReason] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Follow fresh server data after revalidation.
  if (status !== syncedFrom) {
    setSyncedFrom(status);
    setValue(status);
  }

  function save(next: Status, reason?: string) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, next, reason);
      if (result.ok) {
        toast.success(`Moved to ${STATUS_LABELS[next]}`);
      } else {
        setValue(previous);
        toast.error(result.error);
      }
    });
  }

  function onChange(next: string) {
    const s = next as Status;
    if (s === value) return;
    if (s === "closed") setAskReason(true);
    else save(s);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange} disabled={isPending}>
        <SelectTrigger size="sm" className="w-36" aria-label="Status">
          {/* Explicit label so it renders on the server, not only after hydration. */}
          <SelectValue>{STATUS_LABELS[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

      <CloseReasonDialog
        key={askReason ? "open" : "closed"}
        open={askReason}
        company={company}
        onCancel={() => setAskReason(false)}
        onConfirm={(reason) => {
          setAskReason(false);
          save("closed", reason);
        }}
      />
    </div>
  );
}
