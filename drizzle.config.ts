import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL_DIRECT && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_DIRECT must be set for migrations (direct connection, port 5432)");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL!,
  },
});
