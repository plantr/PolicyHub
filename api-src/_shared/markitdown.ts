/**
 * Shared helper for calling the Python MarkItDown serverless function.
 * Used by both document-versions.ts (sync) and ai-jobs.ts (async) endpoints.
 */

export async function convertToMarkdown(fileUrl: string, filename: string): Promise<string> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3001";

  const response = await fetch(`${baseUrl}/api/markitdown-convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: fileUrl, filename }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = (body as any).error || `HTTP ${response.status}`;
    throw new Error(`MarkItDown conversion failed: ${detail}`);
  }

  const data = (await response.json()) as { markdown: string };
  return data.markdown;
}
