import { db } from "../server/db";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema";

async function main() {
  const raw = await db.execute(sql`SELECT id, ai_reviewed_at FROM documents WHERE id = 1`);
  console.log("Raw SQL:", JSON.stringify(raw));

  const drizzle = await db.select({ id: schema.documents.id, aiReviewedAt: schema.documents.aiReviewedAt }).from(schema.documents).where(sql`id = 1`);
  console.log("Drizzle:", JSON.stringify(drizzle));

  process.exit(0);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
