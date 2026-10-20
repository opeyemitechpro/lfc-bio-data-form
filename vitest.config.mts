import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
