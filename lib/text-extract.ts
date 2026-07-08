import "server-only";

// Server-only: extract plain text from a resume file buffer. Supports .pdf and
// .docx (the formats the document library accepts alongside .doc).
//
// pdf-parse (which bundles pdfjs-dist) and mammoth are imported dynamically so
// they only load at runtime when a file is actually extracted — keeping them
// out of route compilation, which otherwise crashes the Turbopack dev worker.

export async function extractResumeText(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string | null; error: string | null }> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  try {
    if (ext === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const data = await parser.getText();
        return { text: normalize(data.text), error: null };
      } finally {
        await parser.destroy();
      }
    }
    if (ext === "docx") {
      const { default: mammoth } = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer });
      return { text: normalize(value), error: null };
    }
    if (ext === "doc") {
      // Legacy .doc (binary) isn't reliably extractable here.
      return {
        text: null,
        error:
          "Legacy .doc files can't be read automatically — paste the resume text instead.",
      };
    }
    return { text: null, error: "Unsupported file type." };
  } catch {
    return {
      text: null,
      error: "Couldn't read that file — try pasting the resume text instead.",
    };
  }
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
