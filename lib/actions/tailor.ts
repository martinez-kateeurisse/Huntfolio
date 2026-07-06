"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { extractResumeText } from "@/lib/text-extract";
import {
  TAILOR_SYSTEM_PROMPT,
  buildTailorUserMessage,
} from "@/lib/ai/tailor-prompt";
import { createPrepNote } from "@/lib/actions/prep";
import { IS_DEMO } from "@/lib/demo";
import { DOCUMENTS_BUCKET } from "@/lib/storage";
import type { ActionResult } from "@/lib/actions/applications";

export type TailorResult = {
  matchSummary: string;
  keyStrengths: string[];
  keywordGaps: string[];
  emphasisSuggestions: string[];
  tailoredSummary: string;
  bulletRewrites: { original: string; rewrite: string }[];
};

// JSON schema the model must fill (structured outputs). Snake_case keys mirror
// the prompt's numbered list; we map to camelCase before returning.
const TAILOR_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    match_summary: { type: "string" },
    key_strengths: { type: "array", items: { type: "string" } },
    keyword_gaps: { type: "array", items: { type: "string" } },
    emphasis_suggestions: { type: "array", items: { type: "string" } },
    tailored_summary: { type: "string" },
    bullet_rewrites: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original: { type: "string" },
          rewrite: { type: "string" },
        },
        required: ["original", "rewrite"],
      },
    },
  },
  required: [
    "match_summary",
    "key_strengths",
    "keyword_gaps",
    "emphasis_suggestions",
    "tailored_summary",
    "bullet_rewrites",
  ],
} as const;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export type TailorInput = {
  applicationId: string;
  company: string;
  roleTitle: string;
  jobDescription: string;
  documentId?: string;
  resumeText?: string;
};

export async function tailorResume(
  input: TailorInput,
): Promise<ActionResult<{ result: TailorResult; prepNoteId?: string }>> {
  if (!input.jobDescription?.trim()) {
    return { ok: false, error: "Paste or provide the job description first." };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "AI tailoring isn't configured — set ANTHROPIC_API_KEY in your environment.",
    };
  }

  // 1. Resolve the resume text (pasted, or extracted from a stored document).
  let resumeText = input.resumeText?.trim() ?? "";
  if (!resumeText && input.documentId) {
    const extracted = await resumeTextFromDocument(input.documentId);
    if (extracted.error) return { ok: false, error: extracted.error };
    resumeText = extracted.text ?? "";
  }
  if (!resumeText) {
    return {
      ok: false,
      error: "Choose a resume from your library or paste resume text.",
    };
  }

  // 2. Ask Claude for structured tailoring guidance (server-side only).
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const client = new Anthropic();

  let parsed: RawTailor;
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: TAILOR_JSON_SCHEMA },
      },
      system: TAILOR_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildTailorUserMessage(input.jobDescription, resumeText) },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "The model declined this request." };
    }

    const jsonText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    parsed = JSON.parse(jsonText) as RawTailor;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Rate limited — try again in a moment." };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Invalid ANTHROPIC_API_KEY." };
    }
    return { ok: false, error: `Tailoring failed: ${message}` };
  }

  const result: TailorResult = {
    matchSummary: parsed.match_summary,
    keyStrengths: parsed.key_strengths ?? [],
    keywordGaps: parsed.keyword_gaps ?? [],
    emphasisSuggestions: parsed.emphasis_suggestions ?? [],
    tailoredSummary: parsed.tailored_summary,
    bulletRewrites: parsed.bullet_rewrites ?? [],
  };

  // 3. Save into prep_notes as a research note linked to the application.
  const saved = await createPrepNote({
    category: "research",
    title: `Tailored — ${input.company} ${input.roleTitle}`.trim(),
    content: formatForNote(result),
    application_id: input.applicationId,
  });

  return {
    ok: true,
    data: {
      result,
      prepNoteId: saved.ok ? saved.data?.id : undefined,
    },
  };
}

type RawTailor = {
  match_summary: string;
  key_strengths: string[];
  keyword_gaps: string[];
  emphasis_suggestions: string[];
  tailored_summary: string;
  bullet_rewrites: { original: string; rewrite: string }[];
};

async function resumeTextFromDocument(
  documentId: string,
): Promise<{ text: string | null; error: string | null }> {
  if (IS_DEMO) {
    return {
      text: null,
      error:
        "Reading a stored resume needs a connected Supabase project. Paste the resume text instead.",
    };
  }

  const { supabase } = await requireUser();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("file_url, name")
    .eq("id", documentId)
    .single();
  if (error || !doc?.file_url) {
    return { text: null, error: "Couldn't find that document." };
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(doc.file_url);
  if (dlErr || !blob) {
    return { text: null, error: "Couldn't download the resume file." };
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const filename = doc.file_url.split("/").pop() ?? doc.name ?? "resume";
  return extractResumeText(buffer, filename);
}

function formatForNote(r: TailorResult): string {
  const lines: string[] = [];
  lines.push("MATCH SUMMARY", r.matchSummary, "");
  if (r.keyStrengths.length) {
    lines.push("KEY STRENGTHS", ...r.keyStrengths.map((s) => `- ${s}`), "");
  }
  if (r.keywordGaps.length) {
    lines.push("KEYWORD GAPS", ...r.keywordGaps.map((s) => `- ${s}`), "");
  }
  if (r.emphasisSuggestions.length) {
    lines.push("EMPHASIS", ...r.emphasisSuggestions.map((s) => `- ${s}`), "");
  }
  lines.push("TAILORED SUMMARY", r.tailoredSummary, "");
  if (r.bulletRewrites.length) {
    lines.push("BULLET REWRITES");
    for (const b of r.bulletRewrites) {
      lines.push(`• Original: ${b.original}`, `  Rewrite:  ${b.rewrite}`);
    }
  }
  lines.push("", "— AI-generated draft. Review before using.");
  return lines.join("\n");
}
