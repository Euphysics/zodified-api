import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ZodifiedApi",
      fileName: (format) => `index.${format}.js`,
      formats: ["es"],
    },
    sourcemap: false,
    minify: "esbuild",
  },
  plugins: [
    dts({
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
