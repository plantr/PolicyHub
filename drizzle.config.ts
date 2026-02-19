import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // DATABASE_URL_DIRECT (direct connection, port 5432) is required for migrate/push.
    // DATABASE_URL (transaction-mode pooler, port 6543) used as fallback for local dev.
    // Neither is required for `drizzle-kit generate` (schema-only, no DB connection).
    url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || "",
  },
});
