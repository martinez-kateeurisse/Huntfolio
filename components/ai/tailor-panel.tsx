"use client";

import { useState } from "react";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { tailorResume, type TailorResult } from "@/lib/actions/tailor";
import type { Document } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TailorPanel({
  applicationId,
  company,
  roleTitle,
  defaultJobDescription,
  documents,
}: {
  applicationId: string;
  company: string;
  roleTitle: string;
  defaultJobDescription: string;
  documents: Document[];
}) {
  const [open, setOpen] = useState(false);
  const [jd, setJd] = useState(defaultJobDescription);
  const [mode, setMode] = useState<"library" | "paste">(
    documents.length > 0 ? "library" : "paste",
  );
  const [docId, setDocId] = useState(documents[0]?.id ?? "");
  const [pasted, setPasted] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResult | null>(null);

  async function run() {
    if (!jd.trim()) {
      toast.error("Add the job description first.");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await tailorResume({
      applicationId,
      company,
      roleTitle,
      jobDescription: jd,
      documentId: mode === "library" ? docId || undefined : undefined,
      resumeText: mode === "paste" ? pasted : undefined,
    });
    setLoading(false);
    if (res.ok && res.data) {
      setResult(res.data.result);
      toast.success("Saved to this application's Prep notes");
    } else if (!res.ok) {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="size-4" /> Tailor to this job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" /> Tailor resume
          </DialogTitle>
          <DialogDescription>
            Claude compares your resume to this job and suggests how to tailor
            it. Suggestions are drafts to review — not to paste blindly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Job description
            </Label>
            <Textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={5}
              placeholder="Paste the job description here…"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 rounded-lg border p-0.5 text-sm w-fit">
              {documents.length > 0 && (
                <ModeButton
                  active={mode === "library"}
                  onClick={() => setMode("library")}
                >
                  From library
                </ModeButton>
              )}
              <ModeButton
                active={mode === "paste"}
                onClick={() => setMode("paste")}
              >
                Paste text
              </ModeButton>
            </div>

            {mode === "library" ? (
              <Select value={docId} onValueChange={setDocId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.version_label ? ` · ${d.version_label}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                placeholder="Paste your resume text here…"
              />
            )}
          </div>

          <Button onClick={run} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {loading ? "Tailoring…" : "Tailor"}
          </Button>

          {result && <TailorResultView result={result} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1",
        active ? "bg-muted font-medium" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function TailorResultView({ result }: { result: TailorResult }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        AI-generated drafts. Review and adapt before using — don&apos;t paste
        blindly. Saved to this application&apos;s Prep notes.
      </div>

      <Section title="Match summary">
        <p className="text-sm">{result.matchSummary}</p>
      </Section>

      {result.keyStrengths.length > 0 && (
        <Section title="Key strengths">
          <ul className="list-disc pl-5 text-sm">
            {result.keyStrengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {result.keywordGaps.length > 0 && (
        <Section title="Keyword gaps">
          <ul className="list-disc pl-5 text-sm">
            {result.keywordGaps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {result.emphasisSuggestions.length > 0 && (
        <Section title="Emphasis suggestions">
          <ul className="list-disc pl-5 text-sm">
            {result.emphasisSuggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Tailored summary">
        <p className="rounded-md border bg-card p-2.5 text-sm">
          {result.tailoredSummary}
        </p>
      </Section>

      {result.bulletRewrites.length > 0 && (
        <Section title="Bullet rewrites">
          <div className="flex flex-col gap-2">
            {result.bulletRewrites.map((b, i) => (
              <div key={i} className="rounded-md border bg-card p-2.5 text-sm">
                <p className="text-muted-foreground line-through">{b.original}</p>
                <p className="mt-1">{b.rewrite}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
