import { z } from "zod";
import {
  CLOSE_REASONS,
  PRIORITIES,
  SOURCES,
  STATUSES,
  TRACKS,
  WORK_MODES,
  INTERVIEW_TYPES,
  INTERVIEW_OUTCOMES,
  DOCUMENT_TYPES,
  PREP_CATEGORIES,
} from "@/lib/constants";

// Optional integer that treats empty strings / null as "not provided".
const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().nonnegative().optional(),
);

// Optional enum: allows "" (the "none" option in a select).
function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values).or(z.literal("")).optional();
}

export const applicationSchema = z
  .object({
    company: z.string().trim().min(1, "Company is required"),
    role_title: z.string().trim().min(1, "Role title is required"),
    job_url: z
      .string()
      .trim()
      .url("Must be a valid URL")
      .or(z.literal(""))
      .optional(),
    source: optionalEnum(SOURCES),
    location: z.string().trim().optional(),
    work_mode: optionalEnum(WORK_MODES),
    salary_min: optionalInt,
    salary_max: optionalInt,
    salary_currency: z.string().trim().min(1).default("PHP"),
    status: z.enum(STATUSES).default("saved"),
    close_reason: optionalEnum(CLOSE_REASONS),
    track: optionalEnum(TRACKS),
    priority: z.enum(PRIORITIES).default("medium"),
    date_applied: z.string().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (v) =>
      v.salary_min === undefined ||
      v.salary_max === undefined ||
      v.salary_max >= v.salary_min,
    { message: "Max salary must be ≥ min salary", path: ["salary_max"] },
  );

export type ApplicationFormValues = z.input<typeof applicationSchema>;
export type ApplicationParsed = z.output<typeof applicationSchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  due_date: z.string().optional(),
  priority: z.enum(PRIORITIES).default("medium"),
  application_id: z.string().uuid().or(z.literal("")).optional(),
});

export type TaskFormValues = z.input<typeof taskSchema>;

// ---- Phase 2: interviews ----
export const interviewSchema = z.object({
  application_id: z.string().uuid().or(z.string().min(1)),
  type: z.enum(INTERVIEW_TYPES).or(z.literal("")).optional(),
  scheduled_at: z.string().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  outcome: z.enum(INTERVIEW_OUTCOMES).default("pending"),
});

export type InterviewFormValues = z.input<typeof interviewSchema>;

// ---- Phase 2: documents ----
export const documentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(DOCUMENT_TYPES).default("resume"),
  version_label: z.string().trim().optional(),
  is_default: z.boolean().default(false),
  file_url: z.string().min(1),
});

export type DocumentFormValues = z.input<typeof documentSchema>;

// ---- Phase 3: prep notes ----
export const prepNoteSchema = z.object({
  category: z.enum(PREP_CATEGORIES),
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().optional(),
  application_id: z.string().uuid().or(z.string().min(1)).or(z.literal("")).optional(),
});

export type PrepNoteFormValues = z.input<typeof prepNoteSchema>;

// ---- Phase 4: contacts ----
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.string().trim().optional(),
  company: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  linkedin: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  application_id: z.string().uuid().or(z.string().min(1)).or(z.literal("")).optional(),
});

export type ContactFormValues = z.input<typeof contactSchema>;
