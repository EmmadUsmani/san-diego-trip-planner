import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 5199);

export default defineConfig({
  testDir: "./e2e",
  // Tests share one local D1, so run serially. Mutating specs should call reseed() in beforeEach.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    // Fresh local D1 (migrate + seed), then the dev server. OSRM is disabled so travel times are deterministic.
    command: `pnpm db:reset:local && vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/api/auth/me`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { OSRM_DISABLED: "1", CLOUDFLARE_INCLUDE_PROCESS_ENV: "true" },
  },
});
