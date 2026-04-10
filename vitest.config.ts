import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Playwright E2E tests live under /e2e and are run separately via
    // `npm run test:e2e`. Exclude them from Vitest unit runs.
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
