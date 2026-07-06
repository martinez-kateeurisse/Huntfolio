"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { contactSchema, type ContactFormValues } from "@/lib/schemas";
import { createContact, updateContact } from "@/lib/actions/contacts";
import type { Contact } from "@/lib/database.types";
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

const UNLINKED = "__none__";

export function ContactForm({
  contact,
  applications,
  fixedApplicationId,
  onDone,
}: {
  contact?: Contact | null;
  applications?: { id: string; company: string }[];
  fixedApplicationId?: string;
  onDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(contact);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name ?? "",
      role: contact?.role ?? "",
      company: contact?.company ?? "",
      email: contact?.email ?? "",
      linkedin: contact?.linkedin ?? "",
      notes: contact?.notes ?? "",
      application_id: fixedApplicationId ?? contact?.application_id ?? "",
    },
  });

  const showAppPicker =
    !fixedApplicationId && applications && applications.length > 0;

  function onSubmit(values: ContactFormValues) {
    const payload = {
      ...values,
      application_id: fixedApplicationId ?? values.application_id,
    };
    startTransition(async () => {
      const result = isEdit
        ? await updateContact(contact!.id, payload)
        : await createContact(payload);
      if (result.ok) {
        toast.success(isEdit ? "Contact updated" : "Contact added");
        onDone?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name")} placeholder="Jane Dela Cruz" autoFocus />
        </Field>
        <Field label="Role" error={errors.role?.message}>
          <Input {...register("role")} placeholder="Technical Recruiter" />
        </Field>
        <Field label="Company" error={errors.company?.message}>
          <Input {...register("company")} placeholder="Acme Inc." />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input {...register("email")} placeholder="jane@acme.com" />
        </Field>
        <Field label="LinkedIn" error={errors.linkedin?.message} className="sm:col-span-2">
          <Input {...register("linkedin")} placeholder="https://linkedin.com/in/…" />
        </Field>

        {showAppPicker && (
          <Field label="Application (optional)" className="sm:col-span-2">
            <Controller
              control={control}
              name="application_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : UNLINKED}
                  onValueChange={(v) => field.onChange(v === UNLINKED ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Link to an application" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNLINKED}>No application</SelectItem>
                    {applications!.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}
      </div>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea {...register("notes")} rows={3} placeholder="How you know them, context…" />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add contact"}
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
