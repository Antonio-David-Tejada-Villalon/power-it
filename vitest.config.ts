import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // mongodb-memory-server descarga/levanta un mongod real; en frío puede
    // tardar más que el timeout por defecto de Vitest (5s).
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
