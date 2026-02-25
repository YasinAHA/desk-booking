import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@app": path.resolve(rootDir, "src/app"),
      "@pages": path.resolve(rootDir, "src/pages"),
      "@features": path.resolve(rootDir, "src/features"),
      "@shared": path.resolve(rootDir, "src/shared")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    globals: true,
    css: true
  }
});
