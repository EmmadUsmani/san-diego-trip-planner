import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(new URL("./db/migrations", import.meta.url).pathname);
  return {
    test: {
      projects: [
        {
          resolve: { alias: { "@shared": new URL("./shared", import.meta.url).pathname } },
          test: { name: "unit", include: ["shared/**/*.test.ts", "src/**/*.test.{ts,tsx}", "db/**/*.test.ts"], environment: "node" },
        },
        {
          plugins: [
            cloudflareTest({
              main: "./worker/index.ts",
              wrangler: { configPath: "./wrangler.jsonc" },
              miniflare: {
                bindings: { TEST_MIGRATIONS: migrations, APP_PASSWORD: "test-pass", SESSION_SECRET: "test-secret", OSRM_DISABLED: "" },
              },
            }),
          ],
          test: { name: "worker", include: ["worker/**/*.test.ts"], setupFiles: ["./worker/test/setup.ts"] },
        },
      ],
    },
  };
});
