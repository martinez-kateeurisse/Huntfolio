import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getApplicationDetail,
  getDocuments,
  getApplicationPrep,
  getContactsForApplication,
  getApplicationEmails,
} from "@/lib/queries";
import { daysSince, formatDate, formatDateTime, formatSalaryRange } from "@/lib/format";
import {
  PRIORITY_LABELS,
  CLOSE_REASON_LABELS,
  type Priority,
  type CloseReason,
  type Status,
} from "@/lib/constants";
import { TrackPill } from "@/components/track-pill";
import { StatusTimeline } from "@/components/applications/status-timeline";
import { StatusSelect } from "@/components/applications/status-select";
import { ApplicationActions } from "@/components/applications/application-actions";
import { DetailTabs, type DetailTab } from "@/components/applications/detail-tabs";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { InterviewSection } from "@/components/interviews/interview-section";
import { AttachDocuments } from "@/components/documents/attach-documents";
import { PrepSection } from "@/components/prep/prep-section";
import { ContactSection } from "@/components/contacts/contact-section";
import { KIND_ICON, KIND_LABEL } from "@/components/inbox/email-kinds";

export const metadata = { title: "Application · Huntfolio" };

const TAB_VALUES = ["overview", "interviews", "files", "history"] as const;

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const [detail, allDocuments, prep, contacts, emails] = await Promise.all([
    getApplicationDetail(id),
    getDocuments(),
    getApplicationPrep(id),
    getContactsForApplication(id),
    getApplicationEmails(id),
  ]);
  if (!detail) notFound();

  const { application: a, tasks, history, interviews, attachedDocuments } =
    detail;
  const salary = formatSalaryRange(a.salary_min, a.salary_max, a.salary_currency);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const applied = daysSince(a.date_applied);

  const tabs: DetailTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Tasks: what to do next for this application */}
          <section className="rounded-xl border bg-card p-5 md:col-span-3">
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
          </section>

          {/* Details */}
          <section className="rounded-xl border bg-card p-5 md:col-span-2">
            <h2 className="mb-4 text-sm font-medium">Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <DetailRow label="Source" value={a.source} />
              <DetailRow label="Work mode" value={a.work_mode} />
              <DetailRow label="Location" value={a.location} />
              <DetailRow label="Salary" value={salary} />
              <DetailRow
                label="Priority"
                value={a.priority ? PRIORITY_LABELS[a.priority as Priority] : null}
              />
              <DetailRow label="Date saved" value={formatDate(a.date_saved)} />
              <DetailRow label="Date applied" value={formatDate(a.date_applied)} />
            </dl>
            {a.notes && (
              <div className="mt-4 flex flex-col gap-1 border-t pt-4">
                <span className="text-xs text-muted-foreground">Notes</span>
                <p className="whitespace-pre-wrap text-sm">{a.notes}</p>
              </div>
            )}
          </section>
        </div>
      ),
    },
    {
      value: "interviews",
      label: "Interviews & prep",
      count: interviews.length,
      content: (
        <>
          <InterviewSection
            applicationId={a.id}
            applicationStatus={a.status}
            interviews={interviews}
          />
          <PrepSection
            applicationId={a.id}
            research={prep.research}
            starStories={prep.star}
          />
        </>
      ),
    },
    {
      value: "files",
      label: "Docs & contacts",
      count: attachedDocuments.length + contacts.length,
      content: (
        <>
          <AttachDocuments
            applicationId={a.id}
            attached={attachedDocuments}
            allDocuments={allDocuments}
          />
          <ContactSection applicationId={a.id} contacts={contacts} />
        </>
      ),
    },
    {
      value: "history",
      label: "History",
      content: (
        <>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium">Status history</h2>
            <StatusTimeline history={history} />
          </section>
          {/* Emails Gmail sync matched to this application (views, messages, outcomes). */}
          {emails.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-medium">From your inbox</h2>
              <ul className="flex flex-col divide-y">
                {emails.map((ev) => {
                  const Icon = KIND_ICON[ev.kind];
                  return (
                    <li key={ev.id} className="flex items-start gap-3 py-2.5">
                      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0">
                        <p className="text-sm">
                          {KIND_LABEL[ev.kind] ?? "Email"}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatDateTime(ev.received_at)}
                          </span>
                        </p>
                        {ev.subject && (
                          <p className="truncate text-xs text-muted-foreground">{ev.subject}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      ),
    },
  ];

  const defaultTab = TAB_VALUES.includes(tab as (typeof TAB_VALUES)[number])
    ? tab!
    : "overview";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/applications"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Applications
      </Link>

      {/* Header: who, what, where it stands — and the main actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {a.track && (
              <div className="mb-1.5">
                <TrackPill track={a.track} />
              </div>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{a.company}</h1>
            <p className="text-muted-foreground">{a.role_title}</p>
          </div>
          <ApplicationActions application={a} documents={allDocuments} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <StatusSelect
            applicationId={a.id}
            company={a.company}
            status={a.status as Status}
          />
          {a.status === "closed" && a.close_reason && (
            <span>
              {CLOSE_REASON_LABELS[a.close_reason as CloseReason] ?? a.close_reason}
            </span>
          )}
          {applied != null ? (
            <span>
              Applied {formatDate(a.date_applied)}
              {applied > 0 && ` · ${applied}d ago`}
            </span>
          ) : (
            <span>Saved {formatDate(a.date_saved)}</span>
          )}
        </div>
      </div>

      <DetailTabs tabs={tabs} defaultTab={defaultTab} />
    </div>
  );
}
