import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { loginSchema } from "../../shared/schemas";
import type { Me } from "../../shared/types";
import type { AppEnv } from "../env";
import { endSession, passwordMatches, startSession } from "../lib/auth";

export const authRoutes = new Hono<AppEnv>()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { password } = c.req.valid("json");
    if (!(await passwordMatches(password, c.env.APP_PASSWORD, c.env.SESSION_SECRET))) {
      throw new HTTPException(401, { message: "Wrong password" });
    }
    await startSession(c);
    return c.json({ authenticated: true } satisfies Me);
  })
  .get("/me", (c) => c.json({ authenticated: c.get("authed") } satisfies Me))
  .post("/logout", (c) => {
    endSession(c);
    return c.json({ authenticated: false } satisfies Me);
  });
