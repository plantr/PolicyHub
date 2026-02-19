import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({
    ok: true,
    time: Date.now(),
    node: process.version,
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    },
  });
}
