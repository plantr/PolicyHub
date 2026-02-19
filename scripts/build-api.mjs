// Pre-bundles api/index.ts → api/index.mjs with all server/shared code inlined.
// External: only node_modules packages (resolved at runtime by Vercel's nft).
import { build } from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const externals = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  "http", "path", "fs", "crypto", "url", "stream", "events", "util", "os",
  "node:*",
  // Exclude local dev-only modules (only used behind !process.env.VERCEL guard)
  "./vite", "./static", "../vite.config",
];

await build({
  entryPoints: ["api/_entry.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "api/index.js",
  external: externals,
  tsconfig: "tsconfig.json",
  sourcemap: true,
  logLevel: "info",
});
