import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // Next's guard against importing server code in the browser; irrelevant under Node.
      "server-only": path("./test/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/support/setup.ts"],
    testTimeout: 20_000,
  },
});
