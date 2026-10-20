import { z } from "zod";

export const MODULE_KEYS = ["bus", "weather", "calendar", "mail"] as const;

export const ModuleStatus = z.enum(["ok", "error", "not_configured"]);

export const ModuleSnapshot = z.object({
  data: z.unknown().nullable(),
  fetchedAt: z.string().datetime().nullable(),
  status: ModuleStatus,
  staleAfterSec: z.number(),
  error: z.string().optional(),
});

export const Snapshot = z.object({
  serverTime: z.string().datetime(),
  version: z.string(),
  config: z.object({
    nightStart: z.string(),
    nightEnd: z.string(),
    timezone: z.literal("Europe/Oslo"),
  }),
  modules: z.record(z.string(), ModuleSnapshot),
});

export type ModuleStatus = z.infer<typeof ModuleStatus>;
export type Snapshot = z.infer<typeof Snapshot>;
export type ModuleSnapshot = z.infer<typeof ModuleSnapshot>;
