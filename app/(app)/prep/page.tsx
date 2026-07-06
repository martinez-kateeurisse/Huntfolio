import { getPrepNotes, getApplications } from "@/lib/queries";
import { PrepBoard } from "@/components/prep/prep-board";

export const metadata = { title: "Prep · Huntfolio" };

export default async function PrepPage() {
  const [notes, applications] = await Promise.all([
    getPrepNotes(),
    getApplications(),
  ]);

  const appOptions = applications.map((a) => ({ id: a.id, company: a.company }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-lg font-semibold">Interview prep</h1>
      <PrepBoard notes={notes} applications={appOptions} />
    </div>
  );
}
