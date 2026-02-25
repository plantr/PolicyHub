/**
 * Seed script: Document Domains
 *
 * Populates the document_domains lookup table.
 * Run with: npx tsx --env-file=.env scripts/seed-document-domains.ts
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const domains = [
  { label: "Compliance", sort_order: 1 },
  { label: "Technology", sort_order: 2 },
  { label: "Information Security", sort_order: 3 },
  { label: "Operations", sort_order: 4 },
  { label: "Risk", sort_order: 5 },
  { label: "Corporate", sort_order: 6 },
];

async function main() {
  console.log("Seeding document domains...");

  const existing = await sql`SELECT label FROM document_domains`;
  const existingLabels = new Set(existing.map((r) => r.label));
  console.log(`Found ${existing.length} existing domains: ${[...existingLabels].join(", ") || "(none)"}`);

  for (const d of domains) {
    if (existingLabels.has(d.label)) {
      console.log(`  - ${d.label} (already exists, skipping)`);
      continue;
    }
    await sql`
      INSERT INTO document_domains (label, sort_order, active)
      VALUES (${d.label}, ${d.sort_order}, true)
    `;
    console.log(`  \u2713 ${d.label}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
