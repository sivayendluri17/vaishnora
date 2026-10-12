// Unit tests for the shared packages and the apps. Pure logic only: no
// database, no network. The metrics and alarmist Lambdas keep their own
// node:test suites (npm run test:packages).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/core/test/**/*.test.ts", "apps/*/test/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    environment: "node",
    // JUnit XML for the pipeline, plain output for the terminal.
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: { junit: "test-results/junit.xml" },
  },
});
