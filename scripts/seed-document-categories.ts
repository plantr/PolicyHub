/**
 * Seed script: Document Categories
 *
 * Populates the document_categories lookup table.
 * Run with: npx tsx --env-file=.env scripts/seed-document-categories.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const categories = [
  { label: "Compliance", sort_order: 1 },
  { label: "Technology", sort_order: 2 },
  { label: "Information Security", sort_order: 3 },
  { label: "Operations", sort_order: 4 },
  { label: "Risk", sort_order: 5 },
  { label: "Corporate", sort_order: 6 },
];

async function main() {
  console.log("Seeding document categories...");

  const existing = await sql`SELECT label FROM document_categories`;
  const existingLabels = new Set(existing.map((r) => r.label));
  console.log(`Found ${existing.length} existing categories: ${[...existingLabels].join(", ") || "(none)"}`);

  for (const c of categories) {
    if (existingLabels.has(c.label)) {
      console.log(`  - ${c.label} (already exists, skipping)`);
      continue;
    }
    await sql`
      INSERT INTO document_categories (label, sort_order, active)
      VALUES (${c.label}, ${c.sort_order}, true)
    `;
    console.log(`  \u2713 ${c.label}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
