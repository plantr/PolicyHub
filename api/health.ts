import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const diagnostics: Record<string, unknown> = {
    ok: true,
    time: Date.now(),
    node: process.version,
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
    },
  };

  // Test imports one by one
  try {
    await import("../shared/schema");
    diagnostics.schemaImport = "ok";
  } catch (e: any) {
    diagnostics.schemaImport = e.message;
  }

  try {
    await import("../server/db");
    diagnostics.dbImport = "ok";
  } catch (e: any) {
    diagnostics.dbImport = e.message;
  }

  try {
    await import("../server/storage");
    diagnostics.storageImport = "ok";
  } catch (e: any) {
    diagnostics.storageImport = e.message;
  }

  try {
    await import("../server/storage-supabase");
    diagnostics.supabaseStorageImport = "ok";
  } catch (e: any) {
    diagnostics.supabaseStorageImport = e.message;
  }

  return res.json(diagnostics);
}
