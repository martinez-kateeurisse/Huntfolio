import {
  getApplicationsWithSignals,
  getDashboardStats,
  getReminders,
} from "@/lib/queries";
import { StatStrip } from "@/components/dashboard/stat-strip";
import { KanbanBoard } from "@/components/board/kanban-board";
import { NeedsAttentionPanel } from "@/components/reminders/needs-attention-panel";

export const metadata = { title: "Board · Huntfolio" };

export default async function BoardPage() {
  const [applications, stats, nudges] = await Promise.all([
    getApplicationsWithSignals(),
    getDashboardStats(),
    getReminders(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <StatStrip stats={stats} />
      <NeedsAttentionPanel nudges={nudges} />
      <KanbanBoard initialApplications={applications} />
    </div>
  );
}
