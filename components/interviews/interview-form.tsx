"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { interviewSchema, type InterviewFormValues } from "@/lib/schemas";
import { createInterview, updateInterview } from "@/lib/actions/interviews";
import {
  INTERVIEW_TYPES,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_OUTCOMES,
  INTERVIEW_OUTCOME_LABELS,
} from "@/lib/constants";
import type { Interview } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export function InterviewForm({
  applicationId,
  interview,
  onDone,
}: {
  applicationId: string;
  interview?: Interview | null;
  onDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(interview);

  const { register, handleSubmit, control } = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      application_id: applicationId,
      type: (interview?.type ?? "") as InterviewFormValues["type"],
      scheduled_at: toLocalInput(interview?.scheduled_at),
      location: interview?.location ?? "",
      notes: interview?.notes ?? "",
      outcome: (interview?.outcome ??
        "pending") as InterviewFormValues["outcome"],
    },
  });

  function onSubmit(values: InterviewFormValues) {
    // Convert the datetime-local value to a full ISO timestamp.
    const payload: InterviewFormValues = {
      ...values,
      application_id: applicationId,
      scheduled_at: values.scheduled_at
        ? new Date(values.scheduled_at).toISOString()
        : "",
    };
    startTransition(async () => {
      const result = isEdit
        ? await updateInterview(interview!.id, payload)
        : await createInterview(payload);
      if (result.ok) {
        toast.success(isEdit ? "Interview updated" : "Interview added");
        onDone?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unspecified</SelectItem>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {INTERVIEW_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Outcome</Label>
          <Controller
            control={control}
            name="outcome"
            render={({ field }) => (
              <Select
                value={String(field.value ?? "pending")}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_OUTCOMES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {INTERVIEW_OUTCOME_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Date &amp; time</Label>
          <Input type="datetime-local" {...register("scheduled_at")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Location / link
          </Label>
          <Input
            {...register("location")}
            placeholder="Room, address, or video link"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea {...register("notes")} rows={3} placeholder="Prep notes, interviewers, etc." />
      </div>

      <div className="mt-1 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add interview"}
        </Button>
      </div>
    </form>
  );
}
