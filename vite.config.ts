/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "index.ts"),
      name: "vite-plugin-i18n",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "umd"],
    },
    rollupOptions: {
      treeshake: true,
      preserveEntrySignatures: "exports-only",
      external: ["url", "fs/promises", "path", "vite", "ohash", "@google-cloud/translate", "consola"],
      output: {
        sourcemap: true,
        exports: "named",
        globals: {
          consola: "consola",
          ohash: "ohash",
          vite: "vite",
          "fs/promises": "fs",
          path: "path",
          url: "url",
          "@google-cloud/translate": "Translate",
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
  },
});
