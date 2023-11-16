/// <reference types="vitest" />
import typescript from "@rollup/plugin-typescript";
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
      external: ["url", "fs/promises", "path", "vite", "ohash", "@google-cloud/translate"],
      output: {
        sourcemap: true,
        exports: "named",
        globals: {
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
  plugins: [
    typescript({
      sourceMap: true,
      declaration: true,
      outDir: "dist",
      exclude: ["src/**/*.spec.ts", "src/demo.ts"],
    })
  ],
  test: {
    environment: "happy-dom",
  },
});
