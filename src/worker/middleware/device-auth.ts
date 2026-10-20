import { and, eq, isNull } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { getDb } from "../db/client";
import { devices } from "../db/schema";
import { DEVICE_COOKIE } from "../lib/cookies";
import { sha256Hex } from "../lib/tokens";

export const deviceAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, DEVICE_COOKIE);
  if (!token) return c.json({ error: "unpaired" }, 401);

  // Lookup by hash in SQL is fine: the token is 256-bit random, no guessable value to time.
  const tokenHash = await sha256Hex(token);
  const [device] = await getDb(c.env.DB)
    .select({ id: devices.id, userId: devices.userId })
    .from(devices)
    .where(and(eq(devices.tokenHash, tokenHash), isNull(devices.revokedAt)))
    .limit(1);
  if (!device) return c.json({ error: "unpaired" }, 401);

  c.set("user", { userId: device.userId, deviceId: device.id });
  await next();
};
