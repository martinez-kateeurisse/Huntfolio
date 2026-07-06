import { getApplications } from "@/lib/queries";
import { ApplicationTable } from "@/components/applications/application-table";
import { AddApplicationButton } from "@/components/applications/add-application-button";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Table · Huntfolio" };

export default async function TablePage() {
  const applications = await getApplications();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">All applications</h1>
        <AddApplicationButton />
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Once you add applications they'll be listed here, sortable and filterable."
          actionLabel="Add your first application"
          actionHref="/applications"
        />
      ) : (
        <ApplicationTable applications={applications} />
      )}
    </div>
  );
}
