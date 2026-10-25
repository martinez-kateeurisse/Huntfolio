import { FileText } from "lucide-react";
import { getDocuments } from "@/lib/queries";
import { LIBRARY_TABS } from "@/lib/navigation";
import { PageHeader } from "@/components/page-header";
import { DocumentLibrary } from "@/components/documents/document-library";
import { DocumentUpload } from "@/components/documents/document-upload";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Documents · Huntfolio" };

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <PageHeader
        title="Library"
        description="Resumes, cover letters, and portfolios — keep versions labeled."
        actions={<DocumentUpload />}
        tabs={LIBRARY_TABS}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No documents yet"
          description="Upload your resumes, cover letters, and portfolio. Keep versions labeled (e.g. “v3 – QA-focused”) and attach them to applications so you always know which one you sent."
        />
      ) : (
        <DocumentLibrary documents={documents} />
      )}
    </div>
  );
}
