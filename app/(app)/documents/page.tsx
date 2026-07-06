import { FileText } from "lucide-react";
import { getDocuments } from "@/lib/queries";
import { DocumentLibrary } from "@/components/documents/document-library";
import { DocumentUpload } from "@/components/documents/document-upload";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Documents · Huntfolio" };

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Documents</h1>
        <DocumentUpload />
      </div>

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
