import type { ModuleKey, Provider } from "./types";

export function notConfiguredProvider(key: ModuleKey, staleAfterSec: number): Provider {
  return {
    key,
    staleAfterSec,
    get: async () => ({ data: null, fetchedAt: null, status: "not_configured", staleAfterSec }),
  };
}
