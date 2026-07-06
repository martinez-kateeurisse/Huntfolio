import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getApplicationDetail,
  getDocuments,
  getApplicationPrep,
  getContactsForApplication,
} from "@/lib/queries";
import { formatDate, formatSalaryRange } from "@/lib/format";
import {
  PRIORITY_LABELS,
  CLOSE_REASON_LABELS,
  type Priority,
  type CloseReason,
} from "@/lib/constants";
import { TrackPill } from "@/components/track-pill";
import { StatusBadge } from "@/components/status-badge";
import { StatusTimeline } from "@/components/applications/status-timeline";
import { EditApplicationButton } from "@/components/applications/edit-application-button";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { InterviewSection } from "@/components/interviews/interview-section";
import { AttachDocuments } from "@/components/documents/attach-documents";
import { PrepSection } from "@/components/prep/prep-section";
import { ContactSection } from "@/components/contacts/contact-section";
import { TailorPanel } from "@/components/ai/tailor-panel";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Application · Huntfolio" };

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, allDocuments, prep, contacts] = await Promise.all([
    getApplicationDetail(id),
    getDocuments(),
    getApplicationPrep(id),
    getContactsForApplication(id),
  ]);
  if (!detail) notFound();

  const { application: a, tasks, history, interviews, attachedDocuments } =
    detail;
  const salary = formatSalaryRange(a.salary_min, a.salary_max, a.salary_currency);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to board
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <TrackPill track={a.track} />
            <StatusBadge status={a.status} />
            {a.status === "closed" && a.close_reason && (
              <span className="text-xs text-muted-foreground">
                ({CLOSE_REASON_LABELS[a.close_reason as CloseReason] ?? a.close_reason})
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold">{a.company}</h1>
          <p className="text-muted-foreground">{a.role_title}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {a.job_url && (
            <a
              href={a.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"
            >
              <ExternalLink className="size-4" /> Job post
            </a>
          )}
          <TailorPanel
            applicationId={a.id}
            company={a.company}
            roleTitle={a.role_title}
            defaultJobDescription={a.notes ?? ""}
            documents={allDocuments}
          />
          <EditApplicationButton application={a} />
          <DeleteApplicationButton id={a.id} company={a.company} />
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Details</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DetailRow label="Source" value={a.source} />
          <DetailRow label="Location" value={a.location} />
          <DetailRow label="Work mode" value={a.work_mode} />
          <DetailRow label="Salary" value={salary} />
          <DetailRow
            label="Priority"
            value={a.priority ? PRIORITY_LABELS[a.priority as Priority] : null}
          />
          <DetailRow label="Date saved" value={formatDate(a.date_saved)} />
          <DetailRow label="Date applied" value={formatDate(a.date_applied)} />
        </dl>
        {a.notes && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Notes</span>
              <p className="whitespace-pre-wrap text-sm">{a.notes}</p>
            </div>
          </>
        )}
      </div>

      {/* Tasks */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium">
          Tasks
          {openTasks.length > 0 && (
            <span className="ml-1.5 text-muted-foreground">
              ({openTasks.length} open)
            </span>
          )}
        </h2>
        <div className="flex flex-col gap-2">
          <QuickAddTask applicationId={a.id} />
          {openTasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
          {doneTasks.length > 0 && (
            <>
              <p className="mt-2 text-xs text-muted-foreground">Completed</p>
              {doneTasks.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </>
          )}
          {tasks.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              No tasks yet. Add a follow-up above.
            </p>
          )}
        </div>
      </div>

      {/* Interviews */}
      <InterviewSection
        applicationId={a.id}
        applicationStatus={a.status}
        interviews={interviews}
      />

      {/* Documents used */}
      <AttachDocuments
        applicationId={a.id}
        attached={attachedDocuments}
        allDocuments={allDocuments}
      />

      {/* Contacts */}
      <ContactSection applicationId={a.id} contacts={contacts} />

      {/* Prep */}
      <PrepSection
        applicationId={a.id}
        research={prep.research}
        starStories={prep.star}
      />

      {/* Status history */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Status history</h2>
        <StatusTimeline history={history} />
      </div>
    </div>
  );
}
