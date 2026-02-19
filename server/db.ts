import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Transaction-mode pooler (port 6543) — prepare: false is REQUIRED
const client = postgres(process.env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
