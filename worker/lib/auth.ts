import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../env";

export const COOKIE_NAME = "sdtp_session";
export const SESSION_DAYS = 90;
const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i]! ^ b[i]!;
  return r === 0;
}

/** Constant-time password check (compares HMACs of both strings). */
export async function passwordMatches(input: string, expected: string, secret: string): Promise<boolean> {
  if (!expected) return false;
  return timingSafeEqual(await hmac(secret, `pw:${input}`), await hmac(secret, `pw:${expected}`));
}

export async function signSession(secret: string, now = Date.now()): Promise<string> {
  const exp = now + SESSION_DAYS * 86400_000;
  return `${exp}.${toHex(await hmac(secret, `session:${exp}`))}`;
}

export async function verifySession(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < now) return false;
  return timingSafeEqual(enc.encode(sig), enc.encode(toHex(await hmac(secret, `session:${exp}`))));
}

export async function startSession(c: Context<AppEnv>) {
  const token = await signSession(c.env.SESSION_SECRET);
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
    secure: new URL(c.req.url).protocol === "https:",
  });
}
export function endSession(c: Context<AppEnv>) {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

/** Sets c.var.authed on every request. */
export const loadSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("authed", await verifySession(getCookie(c, COOKIE_NAME), c.env.SESSION_SECRET));
  await next();
};

/** Rejects unauthenticated requests with 401. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("authed")) throw new HTTPException(401, { message: "Log in to edit" });
  await next();
};

/** Router-level guard: GET/HEAD/OPTIONS are public, everything else needs auth. */
export const requireAuthForWrites: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next();
  return requireAuth(c, next);
};
