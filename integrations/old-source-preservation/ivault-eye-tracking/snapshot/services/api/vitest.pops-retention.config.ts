import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for repo-root `src/pops/retention` (Stage 32) without integration test env.
 */
export default defineConfig({
  test: {
    include: [path.join(__dirname, "../../src/pops/retention/**/*.test.ts")],
    setupFiles: [],
    testTimeout: 30_000
  }
});
