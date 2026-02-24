/**
 * Local development API server.
 *
 * Loads every api-src/*.ts handler and mounts it on /api/<name>.
 * Adapts Express req/res to the shape expected by VercelRequest/VercelResponse
 * so the actual handler code stays unchanged.
 *
 * Usage:  npx tsx scripts/dev-server.ts
 */
import express from "express";
import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "..", "api-src");

const app = express();
app.use(express.json());

// Collect handler files (skip _shared and _ prefixed files)
const files = readdirSync(apiDir).filter(
  (f) => f.endsWith(".ts") && !f.startsWith("_"),
);

for (const file of files) {
  const name = path.basename(file, ".ts");
  const route = `/api/${name}`;
  const modPath = path.resolve(apiDir, file);

  // Dynamic import at startup
  const mod = await import(modPath);
  const handler = mod.default;

  if (typeof handler !== "function") {
    console.warn(`Skipping ${file}: no default export function`);
    continue;
  }

  // Mount for all methods
  app.all(route, async (req: any, res: any) => {
    try {
      // Express 5 already parses query string into req.query, which matches
      // VercelRequest.query closely enough for our handlers.
      await handler(req, res);
    } catch (err) {
      console.error(`[dev-server] Error in ${route}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  console.log(`  ${route}`);
}

const PORT = Number(process.env.API_PORT) || 3001;
app.listen(PORT, () => {
  console.log(`\nAPI dev server listening on http://localhost:${PORT}\n`);
});
