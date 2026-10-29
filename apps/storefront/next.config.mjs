import path from "node:path";
import { fileURLToPath } from "node:url";

// Monorepo: compile the shared workspace packages from source and trace
// dependencies from the repo root so hoisted node_modules ship with SSR.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@vaishnora/core", "@vaishnora/ui"],
  outputFileTracingRoot: repoRoot,
  // Cached pages carry "stale-while-revalidate" for this long (Next's default is
  // a year). After a deploy the old JavaScript files are gone, so a CDN that
  // keeps serving old HTML for days sends shoppers to "Application error".
  expireTime: 3600,
};
export default nextConfig;
