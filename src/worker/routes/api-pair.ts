import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { z } from "zod";
import type { AppEnv } from "../env";
import { getDb } from "../db/client";
import { DEVICE_COOKIE, deviceCookieOptions } from "../lib/cookies";
import { pollPairing, startPairing } from "../lib/pairing";

export const pairRoutes = new Hono<AppEnv>();

const pollBody = z.object({ pollSecret: z.string() });

pairRoutes.post("/start", async (c) => {
  const result = await startPairing(getDb(c.env.DB), Date.now());
  if (result === "too_many") return c.json({ error: "too_many_pending" }, 429);
  return c.json(result);
});

pairRoutes.post("/poll", async (c) => {
  const parsed = pollBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad_request" }, 400);

  const result = await pollPairing(getDb(c.env.DB), parsed.data.pollSecret, Date.now());
  if (result.status === "approved") {
    // The token travels only in the HttpOnly cookie, never in JSON.
    setCookie(c, DEVICE_COOKIE, result.token, deviceCookieOptions(c.req.url));
    return c.json({ status: "approved" });
  }
  return c.json({ status: result.status });
});
