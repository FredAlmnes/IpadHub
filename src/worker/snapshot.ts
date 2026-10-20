import { eq } from "drizzle-orm";
import { ModuleSnapshot, type Snapshot } from "../shared/contract";
import { getDb } from "./db/client";
import { userSettings } from "./db/schema";
import type { Env, UserContext } from "./env";
import { getProviders } from "./providers/registry";
import type { ModuleKey, Provider } from "./providers/types";

export async function buildSnapshot(
  env: Env,
  user: UserContext,
  now: Date,
  providers: Record<ModuleKey, Provider> = getProviders(env),
): Promise<Snapshot> {
  const [settings] = await getDb(env.DB)
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.userId))
    .limit(1);

  const entries = Object.entries(providers) as [ModuleKey, Provider][];
  const results = await Promise.allSettled(entries.map(([, p]) => p.get({ env, user, now })));
  const modules: Record<string, ModuleSnapshot> = {};
  entries.forEach(([key, provider], i) => {
    const r = results[i];
    const parsed = r.status === "fulfilled" ? ModuleSnapshot.safeParse(r.value) : null;
    // Thrown messages may contain secrets: never forwarded (T-01-34).
    modules[key] = parsed?.success
      ? parsed.data
      : { data: null, fetchedAt: null, status: "error", error: "unavailable", staleAfterSec: provider.staleAfterSec };
  });

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
