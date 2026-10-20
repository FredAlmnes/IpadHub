import { describe, expect, it } from "vitest";
import { shouldDailyReload, shouldVersionReload, shouldWatchdogReload } from "./reload-guard";

const MIN = 60000;

describe("shouldVersionReload", () => {
  const base = { clientBuild: "a", serverVersion: "b", lastReloadAt: null as number | null, now: 100 * MIN };
  it("false when same version", () => expect(shouldVersionReload({ ...base, serverVersion: "a" })).toBe(false));
  it("false when undefined", () => expect(shouldVersionReload({ ...base, serverVersion: undefined })).toBe(false));
  it("true when different and no previous reload", () => expect(shouldVersionReload(base)).toBe(true));
  it("false when reloaded 5 min ago", () =>
    expect(shouldVersionReload({ ...base, lastReloadAt: base.now - 5 * MIN })).toBe(false));
  it("true when reloaded 11 min ago", () =>
    expect(shouldVersionReload({ ...base, lastReloadAt: base.now - 11 * MIN })).toBe(true));
});

describe("shouldDailyReload", () => {
  const base = {
    osloDateKey: "2026-10-20",
    minutesOfDay: 210,
    lastDailyKey: "2026-10-19" as string | null,
    wakeWindowOpen: false,
  };
  it("true at 03:30", () => expect(shouldDailyReload(base)).toBe(true));
  it("false at 03:29", () => expect(shouldDailyReload({ ...base, minutesOfDay: 209 })).toBe(false));
  it("false when already done today (DST repeat hour)", () =>
    expect(shouldDailyReload({ ...base, lastDailyKey: "2026-10-20" })).toBe(false));
  it("false during wake window", () => expect(shouldDailyReload({ ...base, wakeWindowOpen: true })).toBe(false));
  it("true at 05:00 when missed", () => expect(shouldDailyReload({ ...base, minutesOfDay: 300 })).toBe(true));
  it("false at 06:00 and later", () => expect(shouldDailyReload({ ...base, minutesOfDay: 360 })).toBe(false));
});

describe("shouldWatchdogReload", () => {
  const now = 1000 * MIN;
  const base = {
    lastSuccessAt: now - 16 * MIN,
    startedAt: now - 60 * MIN,
    now,
    online: true,
    lastReloadAt: null as number | null,
  };
  it("true when stalled > 15 min", () => expect(shouldWatchdogReload(base)).toBe(true));
  it("false when offline", () => expect(shouldWatchdogReload({ ...base, online: false })).toBe(false));
  it("false at 14 min", () => expect(shouldWatchdogReload({ ...base, lastSuccessAt: now - 14 * MIN })).toBe(false));
  it("false when reloaded 5 min ago", () =>
    expect(shouldWatchdogReload({ ...base, lastReloadAt: now - 5 * MIN })).toBe(false));
  it("uses startedAt when no success yet", () =>
    expect(shouldWatchdogReload({ ...base, lastSuccessAt: 0, startedAt: now - 5 * MIN })).toBe(false));
});
