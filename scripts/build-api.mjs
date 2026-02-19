// Bundles each api/*.ts serverless function and produces Vercel Build Output API structure.
// This avoids Vercel's auto-detection of .ts files which conflicts with bundled .js output.
//
// Output structure:
//   .vercel/output/config.json          — routes config
//   .vercel/output/static/              — frontend assets (copied from dist/public)
//   .vercel/output/functions/api/*.func — one directory per serverless function
import { build } from "esbuild";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, cpSync, existsSync } from "fs";
import { basename } from "path";

// Only Node.js built-ins are external — all npm packages are bundled into each function
const externals = [
  "node:*",
  // Also match bare specifiers for Node built-ins
  "http", "https", "path", "fs", "crypto", "url", "stream", "events", "util", "os",
  "net", "tls", "dns", "dgram", "child_process", "cluster", "module", "readline",
  "zlib", "buffer", "string_decoder", "querystring", "assert", "perf_hooks",
  "worker_threads", "async_hooks", "diagnostics_channel", "v8", "vm", "inspector",
];

// Collect all api-src/*.ts files, excluding _shared/ subdirectory and files starting with _
const entries = readdirSync("api-src")
  .filter(f => f.endsWith(".ts") && !f.startsWith("_"))
  .map(f => `api-src/${f}`);

console.log(`Building ${entries.length} serverless functions:`, entries.map(e => e.replace("api-src/", "")));

// Bundle to a temp directory
const tmpDir = ".vercel/output/functions/_tmp";
mkdirSync(tmpDir, { recursive: true });

await build({
  entryPoints: entries,
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: tmpDir,
  outExtension: { ".js": ".js" },
  external: externals,
  tsconfig: "tsconfig.json",
  sourcemap: false,
  logLevel: "info",
  // Tree-shake to keep bundles as small as possible
  treeShaking: true,
  minify: true,
});

// Create .func directories for each function
const funcBase = ".vercel/output/functions/api";
const vcConfig = JSON.stringify({
  runtime: "nodejs22.x",
  handler: "index.js",
  launcherType: "Nodejs",
}, null, 2);

for (const entry of entries) {
  const name = basename(entry, ".ts");
  const funcDir = `${funcBase}/${name}.func`;
  mkdirSync(funcDir, { recursive: true });
  cpSync(`${tmpDir}/${name}.js`, `${funcDir}/index.js`);
  writeFileSync(`${funcDir}/.vc-config.json`, vcConfig);
}

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

// Clean up temp
import("fs").then(fs => fs.rmSync(tmpDir, { recursive: true, force: true }));

console.log(`✅ Build Output API structure created with ${entries.length} functions`);
