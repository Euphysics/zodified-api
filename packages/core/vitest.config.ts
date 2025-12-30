import path from "node:path";
import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.d.ts",
        "**/*.test.ts",
        "src/types/**/*",
        ...defaultExclude,
      ],
    },
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "#core": path.resolve(__dirname, "src"),
    },
  },
});
