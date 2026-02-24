// Bundles each api-src/*.ts serverless function and produces Vercel Build Output API structure.
// Each function is fully bundled with esbuild (all npm packages included) so there are
// no external dependencies to resolve at runtime. This avoids ESM module resolution
// issues with Vercel's native TS runtime.
//
// Source files live in api-src/ (not api/) to prevent Vercel from auto-detecting them
// as serverless functions and conflicting with our Build Output API.
//
// Output structure:
//   .vercel/output/config.json          — routes config
//   .vercel/output/static/              — frontend assets (copied from dist/public)
//   .vercel/output/functions/api/*.func — one directory per serverless function
import { build } from "esbuild";
import { readdirSync, mkdirSync, writeFileSync, cpSync, existsSync, rmSync } from "fs";
import { basename } from "path";

// Clean any previous Build Output API artifacts
if (existsSync(".vercel/output")) {
  rmSync(".vercel/output", { recursive: true, force: true });
}

// Only Node.js built-ins are external — all npm packages are bundled into each function
const externals = [
  "node:*",
  "http", "https", "path", "fs", "crypto", "url", "stream", "events", "util", "os",
  "net", "tls", "dns", "dgram", "child_process", "cluster", "module", "readline",
  "zlib", "buffer", "string_decoder", "querystring", "assert", "perf_hooks",
  "worker_threads", "async_hooks", "diagnostics_channel", "v8", "vm", "inspector",
];

// Collect all api-src/*.ts files, excluding _shared/ subdirectory and files starting with _
const entries = readdirSync("api-src")
  .filter(f => f.endsWith(".ts") && !f.startsWith("_"))
  .map(f => `api-src/${f}`);

console.log(`Building ${entries.length} serverless functions...`);

// Bundle to a temp directory
const tmpDir = ".vercel/output/functions/_tmp";
mkdirSync(tmpDir, { recursive: true });

await build({
  entryPoints: entries,
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: tmpDir,
  outExtension: { ".js": ".mjs" },
  external: externals,
  tsconfig: "tsconfig.json",
  sourcemap: false,
  logLevel: "info",
  treeShaking: true,
  minify: true,
});

// Create .func directories for each function (URL path stays /api/*)
const funcBase = ".vercel/output/functions/api";

// Functions that need extended timeouts for AI processing
const extendedTimeoutFunctions = new Set(["ai-jobs", "document-versions", "gap-analysis"]);

for (const entry of entries) {
  const name = basename(entry, ".ts");
  const funcDir = `${funcBase}/${name}.func`;
  mkdirSync(funcDir, { recursive: true });
  cpSync(`${tmpDir}/${name}.mjs`, `${funcDir}/index.mjs`);

  const vcConfig = {
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: true,
    shouldAddSourcemapSupport: false,
    ...(extendedTimeoutFunctions.has(name) ? { maxDuration: 300 } : {}),
  };
  writeFileSync(`${funcDir}/.vc-config.json`, JSON.stringify(vcConfig, null, 2));
}

// Clean up temp
rmSync(tmpDir, { recursive: true, force: true });

// Copy frontend static assets
const staticDir = ".vercel/output/static";
if (existsSync("dist/public")) {
  cpSync("dist/public", staticDir, { recursive: true });
  console.log("Copied frontend assets to .vercel/output/static/");
}

// Write Build Output API config
const config = {
  version: 3,
  routes: [
    { src: "/api/(.*)", dest: "/api/$1" },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ],
};
writeFileSync(".vercel/output/config.json", JSON.stringify(config, null, 2));

console.log(`Build Output API structure created with ${entries.length} functions`);
