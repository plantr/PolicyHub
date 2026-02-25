/**
 * Converts uploaded documents (PDF, DOCX) to markdown text.
 * Uses unpdf for PDF extraction and mammoth for DOCX conversion.
 * Runs entirely in Node.js — no external service calls needed.
 */
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export async function convertToMarkdown(fileUrl: string, filename: string): Promise<string> {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Failed to fetch file from storage: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  const ext = filename.toLowerCase().split(".").pop() || "";

  switch (ext) {
    case "pdf": {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return text as string;
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
