import { hc, type ClientResponse } from "hono/client";
import type { Api } from "../../worker/app";

/** Typed Hono RPC client. Prefer the hooks in ./hooks.ts; use this directly only for one-off calls. */
export const api = hc<Api>("/api");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Body<R> = R extends ClientResponse<infer T, infer S, infer _F> ? (S extends 400 ? never : T) : never;

/**
 * Resolve a Hono client response to its JSON body (typed from the route), or throw an ApiError
 * carrying the server's message. 400 validation bodies are excluded from the success type.
 */
export async function unwrap<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(res: R): Promise<Body<R>> {
  if (res.ok) return (await res.json()) as Body<R>;
  let message = res.status === 401 ? "Log in to edit" : "Something went wrong";
  let code: string | undefined;
  try {
    const body = (await res.json()) as { error?: string; code?: string };
    if (body.error) message = body.error;
    code = body.code;
  } catch {
    /* non-JSON error */
  }
  throw new ApiError(res.status, message, code);
}
