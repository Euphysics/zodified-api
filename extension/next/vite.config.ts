import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ZodifiedApi/Next",
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["zod", "next"],
      output: {
        globals: {
          zod: "zod",
          next: "next",
        },
      },
    },
    sourcemap: false,
    minify: "esbuild",
  },
  plugins: [dts()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
