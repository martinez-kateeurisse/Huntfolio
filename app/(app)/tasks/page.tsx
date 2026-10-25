import { differenceInCalendarDays } from "date-fns";
import { getTasks, getApplications } from "@/lib/queries";
import { hasDueTime } from "@/lib/format";
import type { TaskWithApplication } from "@/lib/queries";
import { SCHEDULE_TABS } from "@/lib/navigation";
import { PageHeader } from "@/components/page-header";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskItem } from "@/components/tasks/task-item";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Tasks · Huntfolio" };

type Bucket = "overdue" | "today" | "week" | "later" | "none";

const BUCKET_ORDER: { key: Bucket; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "none", label: "No date" },
];

function bucketOf(task: TaskWithApplication): Bucket {
  if (!task.due_date) return "none";
  const due = new Date(task.due_date);
  const diff = differenceInCalendarDays(due, new Date());
  if (diff < 0) return "overdue";
  // A task due at a specific time drops into Overdue once that time passes.
  if (hasDueTime(task.due_date) && due.getTime() < Date.now()) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

export default async function TasksPage() {
  const [tasks, applications] = await Promise.all([
    getTasks(),
    getApplications(),
  ]);

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  const grouped = new Map<Bucket, TaskWithApplication[]>();
  for (const t of open) {
    const b = bucketOf(t);
    if (!grouped.has(b)) grouped.set(b, []);
    grouped.get(b)!.push(t);
  }

  const appOptions = applications.map((a) => ({ id: a.id, company: a.company }));
  const hasAny = tasks.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Schedule"
        description={
          open.length > 0
            ? `${open.length} open ${open.length === 1 ? "task" : "tasks"}, grouped by when they're due.`
            : "Follow-ups and to-dos, grouped by when they're due."
        }
        tabs={SCHEDULE_TABS}
      />

      <div className="flex max-w-3xl flex-col gap-6">
        <QuickAddTask applications={appOptions} />

        {!hasAny ? (
          <EmptyState
            title="No tasks yet"
            description="Add follow-ups, prep reminders, or anything else you don't want to forget. Tasks can stand alone or link to an application."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {BUCKET_ORDER.map(({ key, label }) => {
              const items = grouped.get(key);
              if (!items || items.length === 0) return null;
              return (
                <section key={key} className="flex flex-col gap-2">
                  <h2
                    className={
                      key === "overdue"
                        ? "text-sm font-medium text-destructive"
                        : "text-sm font-medium text-muted-foreground"
                    }
                  >
                    {label}
                    <span className="ml-1.5 opacity-70">{items.length}</span>
                  </h2>
                  {items.map((t) => (
                    <TaskItem key={t.id} task={t} showApplication />
                  ))}
                </section>
              );
            })}

            {open.length === 0 && done.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                🎉 All caught up — no open tasks.
              </p>
            )}

            {/* Completed tasks only pile up; keep them out of the way. */}
            {done.length > 0 && (
              <details className="group flex flex-col gap-2">
                <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span className="group-open:hidden">Show</span>
                  <span className="hidden group-open:inline">Hide</span>{" "}
                  completed
                  <span className="ml-1.5 opacity-70">{done.length}</span>
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {done.map((t) => (
                    <TaskItem key={t.id} task={t} showApplication />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
