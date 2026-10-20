import { notConfiguredProvider } from "./not-configured";
import type { ModuleKey, Provider } from "./types";

// Dev-only demo providers (DEMO_MODULES=1 in .dev.vars) to exercise fresh/stale/error states.
export function demoProviders(): Record<ModuleKey, Provider> {
  return {
    bus: {
      key: "bus",
      staleAfterSec: 180,
      get: async ({ now }) => ({
        data: { label: "Demo" },
        fetchedAt: now.toISOString(),
        status: "ok",
        staleAfterSec: 180,
      }),
    },
    weather: {
      key: "weather",
      staleAfterSec: 5400,
      get: async ({ now }) => ({
        data: { label: "Demo" },
        fetchedAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        status: "ok",
        staleAfterSec: 5400,
      }),
    },
    calendar: {
      key: "calendar",
      staleAfterSec: 1800,
      get: async () => {
        throw new Error("demo failure");
      },
    },
    mail: notConfiguredProvider("mail", 1800),
  };
}
