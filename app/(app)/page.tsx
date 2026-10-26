import Link from "next/link";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  startOfDay,
} from "date-fns";
import { ArrowRight, CalendarClock, ListChecks, Rocket } from "lucide-react";
import {
  getCalendarEvents,
  getDashboardStats,
  getInboxStatus,
  getReminders,
  getTasks,
} from "@/lib/queries";
import { interviewTitle } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { StatStrip } from "@/components/dashboard/stat-strip";
import { NeedsAttentionPanel } from "@/components/reminders/needs-attention-panel";
import { AddApplicationButton } from "@/components/applications/add-application-button";
import { TaskItem } from "@/components/tasks/task-item";
import { EmptyState } from "@/components/empty-state";
import { InboxPanel } from "@/components/inbox/inbox-panel";

export const metadata = { title: "Today · Huntfolio" };

// How far ahead "Today" looks for tasks and interviews.
const TASK_HORIZON_DAYS = 3;
const INTERVIEW_HORIZON_DAYS = 14;
const MAX_TASKS = 6;

function Panel({
  title,
  icon,
  href,
  linkLabel,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-medium">{title}</h2>
        <Link
          href={href}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {linkLabel} <ArrowRight className="size-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

export default async function TodayPage() {
  const now = new Date();
  const [stats, nudges, tasks, events, inbox] = await Promise.all([
    getDashboardStats(),
    getReminders(),
    getTasks(),
    getCalendarEvents(
      startOfDay(now).toISOString(),
      addDays(now, INTERVIEW_HORIZON_DAYS).toISOString(),
    ),
    getInboxStatus(),
  ]);

  const isFirstRun = stats.total === 0;
  const header = (
    <PageHeader
      title="Today"
      description={format(now, "EEEE, MMMM d")}
      actions={isFirstRun ? undefined : <AddApplicationButton />}
    />
  );

  if (isFirstRun) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={<Rocket className="size-5" />}
          title="Start tracking your search"
          description="Add a role you're eyeing or have applied to. Huntfolio will remind you to follow up, keep interviews on your calendar, and show how your search is going."
          action={<AddApplicationButton label="Add your first application" />}
        />
        <div className="max-w-md">
          <InboxPanel status={inbox} />
        </div>
      </div>
    );
  }

  // Overdue plus anything due in the next few days. getTasks is already
  // sorted by due date, so overdue items come first.
  const dueTasks = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.due_date &&
      differenceInCalendarDays(new Date(t.due_date), now) <= TASK_HORIZON_DAYS,
  );
  const interviews = events.filter((e) => e.kind === "interview").slice(0, 5);
  // Overdue tasks and imminent interviews already have their own panels here,
  // so this list is just the people to chase and the applications going quiet.
  const followUps = nudges.filter(
    (n) => n.kind === "follow_up" || n.kind === "stale",
  );

  return (
    <div className="flex flex-col gap-6">
      {header}
      <StatStrip stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel
            title="To do"
            icon={<ListChecks className="size-4" />}
            href="/tasks"
            linkLabel="All tasks"
          >
            {dueTasks.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Nothing due in the next few days.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {dueTasks.slice(0, MAX_TASKS).map((t) => (
                  <TaskItem key={t.id} task={t} showApplication />
                ))}
                {dueTasks.length > MAX_TASKS && (
                  <p className="text-xs text-muted-foreground">
                    +{dueTasks.length - MAX_TASKS} more in Tasks
                  </p>
                )}
              </div>
            )}
          </Panel>

          <NeedsAttentionPanel
            nudges={followUps}
            title="Follow up"
            emptyText="No one to chase right now."
          />
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title="Upcoming interviews"
            icon={<CalendarClock className="size-4" />}
            href="/calendar"
            linkLabel="Calendar"
          >
            {interviews.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No interviews in the next two weeks.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {interviews.map((e) => {
                  const date = new Date(e.date);
                  const type = e.interview ? interviewTitle(e.interview) : "Interview";
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/applications/${e.applicationId}?tab=interviews`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                      >
                        <div className="grid w-11 shrink-0 place-items-center rounded-md bg-muted py-1 text-center">
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            {format(date, "MMM")}
                          </span>
                          <span className="text-base font-semibold leading-none">
                            {format(date, "d")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {e.company ?? "Interview"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {type} · {dayLabel(date)},{" "}
                            {format(date, "h:mma").toLowerCase()}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <InboxPanel status={inbox} />
        </div>
      </div>
    </div>
  );
}
