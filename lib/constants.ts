// Central domain vocabulary for Huntfolio. Keeping these in one place means the
// board, table, forms, and filters all speak the same language.

export const TRACKS = ["qa", "dev", "data", "ai"] as const;
export type Track = (typeof TRACKS)[number];

export const TRACK_LABELS: Record<Track, string> = {
  qa: "QA",
  dev: "Dev",
  data: "Data",
  ai: "AI",
};

// Maps to the .track-* classes defined in globals.css.
export const TRACK_PILL_CLASS: Record<Track, string> = {
  qa: "track-qa",
  dev: "track-dev",
  data: "track-data",
  ai: "track-ai",
};

export const STATUSES = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "closed",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

// Fixed pipeline order for the board columns.
export const PIPELINE: Status[] = [...STATUSES];

// A status is "past applied" once the candidate has actually applied. Used for
// the active-applications and response-rate stats.
export const APPLIED_OR_BEYOND: Status[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "closed",
];
export const RESPONDED_STATUSES: Status[] = [
  "screening",
  "interview",
  "offer",
];

export const SOURCES = [
  "JobStreet",
  "LinkedIn",
  "Referral",
  "Company site",
  "Other",
] as const;
export type Source = (typeof SOURCES)[number];

export const WORK_MODES = ["Onsite", "Hybrid", "Remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const CLOSE_REASONS = ["rejected", "accepted", "withdrawn"] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export const CLOSE_REASON_LABELS: Record<CloseReason, string> = {
  rejected: "Rejected",
  accepted: "Accepted",
  withdrawn: "Withdrawn",
};

export const CURRENCIES = ["PHP", "USD", "EUR", "SGD", "GBP"] as const;

// ---- Phase 2: interviews ----
export const INTERVIEW_TYPES = [
  "phone",
  "technical",
  "hr",
  "final",
  "other",
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone: "Phone",
  technical: "Technical",
  hr: "HR",
  final: "Final",
  other: "Other",
};

export const INTERVIEW_OUTCOMES = ["pending", "passed", "failed"] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
};

// ---- Phase 2: documents ----
export const DOCUMENT_TYPES = [
  "resume",
  "cover_letter",
  "portfolio",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  resume: "Resume",
  cover_letter: "Cover letter",
  portfolio: "Portfolio",
  other: "Other",
};

// ---- Phase 3: interview-prep notes ----
export const PREP_CATEGORIES = ["research", "questions", "star"] as const;
export type PrepCategory = (typeof PREP_CATEGORIES)[number];

export const PREP_CATEGORY_LABELS: Record<PrepCategory, string> = {
  research: "Research",
  questions: "Questions",
  star: "STAR stories",
};

export const PREP_CATEGORY_HINTS: Record<PrepCategory, string> = {
  research: "Company & role research, linked to an application.",
  questions: "Your reusable bank of Q&A — things you'll be asked and want to ask.",
  star: "Reusable Situation–Task–Action–Result stories.",
};

// File upload rules: pdf/doc/docx only, ≤ 10 MB.
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_DOC_EXTENSIONS = ["pdf", "doc", "docx"] as const;
export const ALLOWED_DOC_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

// Validates a File against the extension + size rules. Returns an error message
// or null when valid. (MIME is checked leniently — some browsers omit it for
// .doc/.docx — so extension is the source of truth.)
export function validateDocumentFile(file: {
  name: string;
  size: number;
}): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_DOC_EXTENSIONS.includes(ext as (typeof ALLOWED_DOC_EXTENSIONS)[number])) {
    return "Only PDF, DOC, or DOCX files are allowed.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File must be 10 MB or smaller.";
  }
  return null;
}
