import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Sets CORS headers on a Vercel response.
 * Vercel handles domain restrictions at the project settings level.
 */
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * Handles CORS preflight and sets headers.
 * Returns true if the request was handled (OPTIONS preflight), false otherwise.
 * Usage: if (handleCors(req, res)) return;
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
