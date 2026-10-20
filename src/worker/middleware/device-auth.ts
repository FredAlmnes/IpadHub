import { and, eq, isNull } from "drizzle-orm";
import { getCookie, setCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { getDb } from "../db/client";
import { devices } from "../db/schema";
import { DEVICE_COOKIE, deviceCookieOptions } from "../lib/cookies";
import { sha256Hex } from "../lib/tokens";

const LAST_SEEN_THROTTLE_MS = 300000; // 5 minutes

export const deviceAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, DEVICE_COOKIE);
  if (!token) return c.json({ error: "unpaired" }, 401);

  // Lookup by hash in SQL is fine: the token is 256-bit random, no guessable value to time.
  const tokenHash = await sha256Hex(token);
  const db = getDb(c.env.DB);
  const [device] = await db
    .select({ id: devices.id, userId: devices.userId, lastSeenAt: devices.lastSeenAt })
    .from(devices)
    .where(and(eq(devices.tokenHash, tokenHash), isNull(devices.revokedAt)))
    .limit(1);
  if (!device) return c.json({ error: "unpaired" }, 401);

  // Throttled last-seen write with sliding cookie renewal (about 290 writes/day max).
  const now = Date.now();
  if (now - device.lastSeenAt > LAST_SEEN_THROTTLE_MS) {
    await db.update(devices).set({ lastSeenAt: now }).where(eq(devices.id, device.id));
    setCookie(c, DEVICE_COOKIE, token, deviceCookieOptions(c.req.url));
  }

  c.set("user", { userId: device.userId, deviceId: device.id });
  await next();
};
