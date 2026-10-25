import { getApplicationsWithSignals } from "@/lib/queries";
import { APPLICATION_TABS } from "@/lib/navigation";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/board/kanban-board";
import { AddApplicationButton } from "@/components/applications/add-application-button";

export const metadata = { title: "Applications · Huntfolio" };

export default async function BoardPage() {
  const applications = await getApplicationsWithSignals();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Applications"
        description="Drag a card to move it through your pipeline."
        actions={<AddApplicationButton />}
        tabs={APPLICATION_TABS}
      />
      <KanbanBoard initialApplications={applications} />
    </div>
  );
}
