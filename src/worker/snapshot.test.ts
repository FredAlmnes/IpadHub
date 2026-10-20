import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { Snapshot } from "../shared/contract";
import type { Env } from "./env";
import { getProviders } from "./providers/registry";
import { buildSnapshot } from "./snapshot";

const USER = { userId: "user-1", deviceId: "dev-1" };
const NOW = new Date("2026-10-20T12:00:00.000Z");
const E = env as unknown as Env;

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM user_settings").run();
});

describe("buildSnapshot", () => {
  it("default env: all modules not_configured with provider staleAfterSec", async () => {
    const snap = await buildSnapshot(E, USER, NOW);
    expect(Snapshot.parse(snap)).toBeTruthy();
    expect(snap.modules.bus).toMatchObject({ status: "not_configured", staleAfterSec: 180 });
    expect(snap.modules.weather).toMatchObject({ status: "not_configured", staleAfterSec: 5400 });
    expect(snap.modules.calendar).toMatchObject({ status: "not_configured", staleAfterSec: 1800 });
    expect(snap.modules.mail).toMatchObject({ status: "not_configured", staleAfterSec: 1800 });
  });

  it("a throwing provider only errors its own module and leaks no message", async () => {
    const providers = getProviders(E);
    providers.calendar = {
      key: "calendar",
      staleAfterSec: 1800,
      get: async () => {
        throw new Error("secret-token-abc");
      },
    };
    const snap = await buildSnapshot(E, USER, NOW, providers);
    expect(snap.modules.calendar).toEqual({
      data: null,
      fetchedAt: null,
      status: "error",
      error: "unavailable",
      staleAfterSec: 1800,
    });
    expect(JSON.stringify(snap)).not.toContain("secret-token-abc");
    expect(snap.modules.bus.status).toBe("not_configured");
  });

  it("an invalid provider shape is treated as error", async () => {
    const providers = getProviders(E);
    providers.mail = {
      key: "mail",
      staleAfterSec: 1800,
      get: async () => ({ nonsense: true }) as never,
    };
    const snap = await buildSnapshot(E, USER, NOW, providers);
    expect(snap.modules.mail).toMatchObject({ status: "error", error: "unavailable", staleAfterSec: 1800 });
    Snapshot.parse(snap);
  });

  it("DEMO_MODULES=1 yields ok / stale / error / not_configured", async () => {
    const demoEnv = { ...env, DEMO_MODULES: "1" } as unknown as Env;
    const snap = await buildSnapshot(demoEnv, USER, NOW);
    Snapshot.parse(snap);
    expect(snap.modules.bus).toMatchObject({ status: "ok", fetchedAt: NOW.toISOString() });
    expect(snap.modules.weather.status).toBe("ok");
    expect(NOW.getTime() - Date.parse(snap.modules.weather.fetchedAt!)).toBe(2 * 3600 * 1000);
    expect(snap.modules.calendar.status).toBe("error");
    expect(snap.modules.mail.status).toBe("not_configured");
  });
});
