"use client";

import { useTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applicationSchema, type ApplicationFormValues } from "@/lib/schemas";
import {
  createApplication,
  updateApplication,
} from "@/lib/actions/applications";
import {
  CLOSE_REASONS,
  CLOSE_REASON_LABELS,
  CURRENCIES,
  PRIORITIES,
  PRIORITY_LABELS,
  SOURCES,
  STATUSES,
  STATUS_LABELS,
  TRACKS,
  TRACK_LABELS,
  WORK_MODES,
  type Track,
} from "@/lib/constants";
import type { Application } from "@/lib/database.types";
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

const NONE = "__none__"; // Radix Select can't use an empty-string value.

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10); // yyyy-mm-dd
}

function defaultsFrom(app?: Application | null): ApplicationFormValues {
  return {
    company: app?.company ?? "",
    role_title: app?.role_title ?? "",
    job_url: app?.job_url ?? "",
    source: (app?.source ?? "") as ApplicationFormValues["source"],
    location: app?.location ?? "",
    work_mode: (app?.work_mode ?? "") as ApplicationFormValues["work_mode"],
    salary_min: app?.salary_min ?? undefined,
    salary_max: app?.salary_max ?? undefined,
    salary_currency: app?.salary_currency ?? "PHP",
    status: (app?.status ?? "saved") as ApplicationFormValues["status"],
    close_reason: (app?.close_reason ??
      "") as ApplicationFormValues["close_reason"],
    track: (app?.track ?? "") as ApplicationFormValues["track"],
    priority: (app?.priority ?? "medium") as ApplicationFormValues["priority"],
    date_applied: toDateInput(app?.date_applied),
    notes: app?.notes ?? "",
  };
}

export function ApplicationForm({
  application,
  onDone,
}: {
  application?: Application | null;
  onDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(application);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: defaultsFrom(application),
  });

  const status = useWatch({ control, name: "status" });

  function onSubmit(values: ApplicationFormValues) {
    startTransition(async () => {
      const result = isEdit
        ? await updateApplication(application!.id, values)
        : await createApplication(values);

      if (result.ok) {
        toast.success(isEdit ? "Application updated" : "Application added");
        onDone?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company" error={errors.company?.message} className="sm:col-span-1">
          <Input {...register("company")} placeholder="Acme Inc." autoFocus />
        </Field>
        <Field label="Role title" error={errors.role_title?.message}>
          <Input {...register("role_title")} placeholder="Frontend Engineer" />
        </Field>

        <SelectField
          control={control}
          name="track"
          label="Track"
          placeholder="No track"
          allowNone
          options={TRACKS.map((t) => ({
            value: t,
            label: TRACK_LABELS[t as Track],
          }))}
        />
        <SelectField
          control={control}
          name="status"
          label="Status"
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        />

        <SelectField
          control={control}
          name="priority"
          label="Priority"
          options={PRIORITIES.map((p) => ({
            value: p,
            label: PRIORITY_LABELS[p],
          }))}
        />
        <SelectField
          control={control}
          name="source"
          label="Source"
          placeholder="No source"
          allowNone
          options={SOURCES.map((s) => ({ value: s, label: s }))}
        />

        <SelectField
          control={control}
          name="work_mode"
          label="Work mode"
          placeholder="Unspecified"
          allowNone
          options={WORK_MODES.map((w) => ({ value: w, label: w }))}
        />
        <Field label="Location" error={errors.location?.message}>
          <Input {...register("location")} placeholder="Makati City" />
        </Field>

        <Field label="Job URL" error={errors.job_url?.message} className="sm:col-span-2">
          <Input {...register("job_url")} placeholder="https://…" />
        </Field>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:col-span-2">
          <Field label="Salary min" error={errors.salary_min?.message}>
            <Input type="number" min={0} {...register("salary_min")} placeholder="0" />
          </Field>
          <Field label="Salary max" error={errors.salary_max?.message}>
            <Input type="number" min={0} {...register("salary_max")} placeholder="0" />
          </Field>
          <SelectField
            control={control}
            name="salary_currency"
            label="Currency"
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </div>

        <Field label="Date applied" error={errors.date_applied?.message}>
          <Input type="date" {...register("date_applied")} />
        </Field>
        {status === "closed" && (
          <SelectField
            control={control}
            name="close_reason"
            label="Close reason"
            placeholder="Select reason"
            allowNone
            options={CLOSE_REASONS.map((r) => ({
              value: r,
              label: CLOSE_REASON_LABELS[r],
            }))}
          />
        )}
      </div>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea
          {...register("notes")}
          rows={3}
          placeholder="Anything worth remembering…"
        />
      </Field>

      <div className="mt-1 flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add application"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SelectField({
  control,
  name,
  label,
  options,
  placeholder,
  allowNone,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  name: keyof ApplicationFormValues;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowNone?: boolean;
}) {
  return (
    <Field label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ? String(field.value) : allowNone ? NONE : undefined}
            onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder ?? label} />
            </SelectTrigger>
            <SelectContent>
              {allowNone && (
                <SelectItem value={NONE}>
                  {placeholder ?? "None"}
                </SelectItem>
              )}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}
