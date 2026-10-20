import { Hono } from "hono";
import type { AppEnv } from "../env";
import { buildSnapshot } from "../snapshot";

export const snapshotRoutes = new Hono<AppEnv>();

snapshotRoutes.get("/", async (c) => c.json(await buildSnapshot(c.env, c.get("user"), new Date())));
