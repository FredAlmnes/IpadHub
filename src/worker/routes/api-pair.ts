import { Hono } from "hono";
import type { AppEnv } from "../env";
import { getDb } from "../db/client";
import { startPairing } from "../lib/pairing";

export const pairRoutes = new Hono<AppEnv>();

pairRoutes.post("/start", async (c) => {
  const result = await startPairing(getDb(c.env.DB), Date.now());
  if (result === "too_many") return c.json({ error: "too_many_pending" }, 429);
  return c.json(result);
});
