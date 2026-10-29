import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, vi } from "vitest";
import { mockFetch, resetDb } from "./helpers";

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS as never);
  await resetDb();
});

// No real network in tests: any fetch that a test did not explicitly mock throws.
beforeEach(() => {
  mockFetch(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});
