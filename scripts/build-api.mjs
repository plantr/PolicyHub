// Bundles each api/*.ts file into its own api/*.js file.
// Vercel auto-discovers individual function files at api/*.js.
// External: only node_modules packages (resolved at runtime by Vercel's nft).
import { build } from "esbuild";
import { readFileSync, readdirSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const externals = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  "http", "path", "fs", "crypto", "url", "stream", "events", "util", "os",
  "node:*",
  // Exclude local dev-only modules (only used behind !process.env.VERCEL guard)
  "./vite", "./static", "../vite.config",
];

// Collect all api/*.ts files, excluding _shared/ subdirectory and files starting with _
const entries = readdirSync("api")
  .filter(f => f.endsWith(".ts") && !f.startsWith("_"))
  .map(f => `api/${f}`);

console.log(`Building ${entries.length} serverless functions:`, entries.map(e => e.replace("api/", "")));

await build({
  entryPoints: entries,
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: "api",
  outExtension: { ".js": ".js" },
  external: externals,
  tsconfig: "tsconfig.json",
  sourcemap: true,
  logLevel: "info",
});
