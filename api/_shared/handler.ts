import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

/**
 * Parses the request body against a Zod schema.
 * Throws { status: 400, message: string } on validation failure.
 */
export function parseBody<T>(req: VercelRequest, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw { status: 400, message: result.error.errors[0].message };
  }
  return result.data;
}

/**
 * Sends an error response. Uses .status property if present, otherwise 500.
 * ZodErrors produce 400 with the first error message.
 */
export function sendError(res: VercelResponse, err: unknown): void {
  console.error("[API Error]", err);

  if (err instanceof z.ZodError) {
    res.status(400).json({ message: err.errors[0].message });
    return;
  }

  if (err && typeof err === "object" && "status" in err) {
    const e = err as { status: number; message?: string };
    res.status(e.status).json({ message: e.message || "Request error" });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message || "Internal server error" });
    return;
  }

  res.status(500).json({ message: "Internal server error" });
}

/**
 * Extracts and parses the `id` query parameter as a number.
 * Throws { status: 400, message: string } if missing or not a valid number.
 */
export function getIdParam(req: VercelRequest): number {
  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) throw { status: 400, message: "Missing id parameter" };
  const parsed = Number(id);
  if (isNaN(parsed)) throw { status: 400, message: "Invalid id parameter" };
  return parsed;
}
