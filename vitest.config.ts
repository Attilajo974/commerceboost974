import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  plugins: [react()],
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "jsdom"],
      ["client/**/*.test.ts", "jsdom"],
      ["server/**/*.test.ts", "node"],
      ["server/**/*.spec.ts", "node"],
    ],
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.tsx",
      "client/**/*.test.ts",
    ],
    setupFiles: ["./client/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "server/**/*.ts",
        "client/**/*.ts",
        "client/**/*.tsx",
      ],
      exclude: [
        "server/**/*.test.ts",
        "server/**/*.spec.ts",
        "client/**/*.test.tsx",
        "client/**/*.test.ts",
        "client/test/**",
      ],
    },
  },
});
