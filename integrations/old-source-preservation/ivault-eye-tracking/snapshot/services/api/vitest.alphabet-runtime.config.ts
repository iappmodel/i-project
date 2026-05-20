import path from "node:path";
import { defineConfig } from "vitest/config";

/** Unit-only: no tests/setup/env.ts (avoids API_BASE_URL for pure runtime boundary tests). */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  test: {
    include: ["src/lib/alphabet/runtime/__tests__/pipeline-runtime.test.ts"],
    setupFiles: []
  }
});
