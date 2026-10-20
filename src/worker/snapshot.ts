import { eq } from "drizzle-orm";
import { MODULE_KEYS, type ModuleSnapshot, type Snapshot } from "../shared/contract";
import { getDb } from "./db/client";
import { userSettings } from "./db/schema";
import type { Env, UserContext } from "./env";

export const STALE_AFTER_SEC: Record<(typeof MODULE_KEYS)[number], number> = {
  bus: 180,
  weather: 5400,
  calendar: 1800,
  mail: 1800,
};

export async function buildSnapshot(env: Env, user: UserContext, now: Date): Promise<Snapshot> {
  const [settings] = await getDb(env.DB)
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.userId))
    .limit(1);

  const modules: Record<string, ModuleSnapshot> = {};
  for (const key of MODULE_KEYS) {
    modules[key] = {
      data: null,
      fetchedAt: null,
      status: "not_configured",
      staleAfterSec: STALE_AFTER_SEC[key],
    };
  }

  return {
    serverTime: now.toISOString(),
    version: __BUILD_ID__,
    config: {
      nightStart: settings?.nightStart ?? "23:00",
      nightEnd: settings?.nightEnd ?? "06:00",
      timezone: "Europe/Oslo",
    },
    modules,
  };
}
