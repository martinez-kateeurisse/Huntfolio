import { getApplications } from "@/lib/queries";
import { APPLICATION_TABS } from "@/lib/navigation";
import { PageHeader } from "@/components/page-header";
import { ApplicationTable } from "@/components/applications/application-table";
import { AddApplicationButton } from "@/components/applications/add-application-button";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Applications · Huntfolio" };

export default async function TablePage() {
  const applications = await getApplications();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Applications"
        description="Every application in one list — sort and filter to compare."
        actions={<AddApplicationButton />}
        tabs={APPLICATION_TABS}
      />

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Once you add applications they'll be listed here, sortable and filterable."
          action={<AddApplicationButton label="Add your first application" />}
        />
      ) : (
        <ApplicationTable applications={applications} />
      )}
    </div>
  );
}
