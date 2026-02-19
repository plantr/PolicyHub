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

// Bundle to a temp directory
const tmpDir = ".vercel/output/functions/_tmp";
mkdirSync(tmpDir, { recursive: true });

await build({
  entryPoints: entries,
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: tmpDir,
  outExtension: { ".js": ".js" },
  external: externals,
  tsconfig: "tsconfig.json",
  sourcemap: false,
  logLevel: "info",
});

// Create .func directories for each function
const funcBase = ".vercel/output/functions/api";
const vcConfig = JSON.stringify({
  runtime: "nodejs22.x",
  handler: "index.mjs",
  launcherType: "Nodejs",
}, null, 2);

for (const entry of entries) {
  const name = basename(entry, ".ts");
  const funcDir = `${funcBase}/${name}.func`;
  mkdirSync(funcDir, { recursive: true });
  // Copy bundled JS as index.mjs (ESM)
  cpSync(`${tmpDir}/${name}.js`, `${funcDir}/index.mjs`);
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
