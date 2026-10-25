import { getPrepNotes, getApplications } from "@/lib/queries";
import { LIBRARY_TABS } from "@/lib/navigation";
import { PageHeader } from "@/components/page-header";
import { PrepBoard } from "@/components/prep/prep-board";

export const metadata = { title: "Interview prep · Huntfolio" };

export default async function PrepPage() {
  const [notes, applications] = await Promise.all([
    getPrepNotes(),
    getApplications(),
  ]);

  const appOptions = applications.map((a) => ({ id: a.id, company: a.company }));

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <PageHeader
        title="Library"
        description="Company research, your question bank, and reusable STAR stories."
        tabs={LIBRARY_TABS}
      />
      <PrepBoard notes={notes} applications={appOptions} />
    </div>
  );
}
