import path from "node:path";
import { defineConfig } from "vitest/config";

const repoPopsRetentionTests = path.join(
  __dirname,
  "../../src/pops/retention/**/*.test.ts"
);

const repoPopsWalletSecurityTests = path.join(
  __dirname,
  "../../src/pops/wallet-security/**/*.test.ts"
);

const repoPopsPermissionTests = path.join(__dirname, "../../src/pops/permissions/**/*.test.ts");

const repoPopsFallbackTests = path.join(__dirname, "../../src/pops/fallback/**/*.test.ts");

const repoPopsFairnessTests = path.join(__dirname, "../../src/pops/fairness/**/*.test.ts");

const repoRemoteFeatureTests = path.join(__dirname, "../../src/features/remote/**/*.test.ts");

const repoPopsNormalizationTests = path.join(__dirname, "../../src/pops/normalization/**/*.test.ts");

const repoPopsCopyReviewerTests = path.join(__dirname, "../../src/pops/copy/pops-copy-reviewer.test.ts");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/__tests__/**/*.test.ts",
      repoPopsRetentionTests,
      repoPopsWalletSecurityTests,
      repoPopsPermissionTests,
      repoPopsFallbackTests,
      repoPopsFairnessTests,
      repoRemoteFeatureTests,
      repoPopsNormalizationTests,
      repoPopsCopyReviewerTests
    ],
    setupFiles: ["tests/setup/env.ts"],
    testTimeout: 30_000
  }
});
