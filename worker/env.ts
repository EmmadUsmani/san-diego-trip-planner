export type Env = WorkerEnv;
interface WorkerEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_PASSWORD: string;
  SESSION_SECRET: string;
  /** Set to "1" to skip OSRM and always use the heuristic (used by e2e). */
  OSRM_DISABLED?: string;
  /** Test-only: D1 migrations injected by vitest. */
  TEST_MIGRATIONS?: unknown;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { authed: boolean };
};

// Makes `env` from "cloudflare:workers" (used by vitest-pool-workers tests) typed with our bindings.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Env extends WorkerEnv {}
  }
}
