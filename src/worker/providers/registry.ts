import type { Env } from "../env";
import { demoProviders } from "./demo";
import { notConfiguredProvider } from "./not-configured";
import type { ModuleKey, Provider } from "./types";

// Extension point for phases 2-4: replace a notConfigured provider with the real one.
export function getProviders(env: Env): Record<ModuleKey, Provider> {
  if (env.DEMO_MODULES === "1") return demoProviders();
  return {
    bus: notConfiguredProvider("bus", 180),
    weather: notConfiguredProvider("weather", 5400),
    calendar: notConfiguredProvider("calendar", 1800),
    mail: notConfiguredProvider("mail", 1800),
  };
}
