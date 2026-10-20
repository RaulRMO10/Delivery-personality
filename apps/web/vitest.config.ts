import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" impede importação no navegador; nos testes roda em Node.
      "server-only": fileURLToPath(new URL("./src/test/vazio.ts", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
