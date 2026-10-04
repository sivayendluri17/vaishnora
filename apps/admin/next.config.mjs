import path from "node:path";
import { fileURLToPath } from "node:url";

// Monorepo: compile the shared workspace packages from source and trace
// dependencies from the repo root so hoisted node_modules ship with SSR.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@vaishnora/core", "@vaishnora/ui"],
  outputFileTracingRoot: repoRoot,
};
export default nextConfig;
