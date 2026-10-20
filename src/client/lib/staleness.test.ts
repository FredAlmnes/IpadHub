import { describe, expect, it } from "vitest";
import type { ModuleSnapshot } from "../../shared/contract";
import { formatFreshness, isOffline, moduleState } from "./staleness";

const SERVER = "2026-10-20T12:40:00.000Z";
const mod = (over: Partial<ModuleSnapshot>): ModuleSnapshot => ({
  data: null,
  fetchedAt: null,
  status: "ok",
  staleAfterSec: 180,
  ...over,
});

describe("moduleState", () => {
  const base = { serverTime: SERVER, receivedAtLocal: 1_000_000, nowLocal: 1_000_000 };
  it("not_configured", () => {
    expect(moduleState({ ...base, module: mod({ status: "not_configured" }) })).toBe("not_configured");
  });
  it("error without fetchedAt -> error, with fetchedAt -> stale", () => {
    expect(moduleState({ ...base, module: mod({ status: "error" }) })).toBe("error");
    expect(moduleState({ ...base, module: mod({ status: "error", fetchedAt: "2026-10-20T12:00:00.000Z" }) })).toBe("stale");
  });
  it("fresh within staleAfterSec, stale beyond", () => {
    const m = mod({ status: "ok", fetchedAt: "2026-10-20T12:38:00.000Z" }); // age 120 s
    expect(moduleState({ ...base, module: m })).toBe("fresh");
    expect(moduleState({ ...base, module: m, nowLocal: base.receivedAtLocal + 50_000 })).toBe("fresh");
    expect(moduleState({ ...base, module: m, nowLocal: base.receivedAtLocal + 70_000 })).toBe("stale");
  });
  it("local elapsed time counts even when device clock differs from server", () => {
    const m = mod({ status: "ok", fetchedAt: SERVER });
    // wildly different absolute local clock; only the delta matters
    expect(moduleState({ module: m, serverTime: SERVER, receivedAtLocal: 5, nowLocal: 5 + 200_000 })).toBe("stale");
  });
});

describe("formatFreshness", () => {
  const now = new Date("2026-10-20T12:40:00.000Z"); // Tuesday 14:40 Oslo
  it("fresh / stale same day", () => {
    expect(formatFreshness("fresh", "2026-10-20T12:32:00.000Z", now)).toBe("Oppdatert 14:32");
    expect(formatFreshness("stale", "2026-10-20T12:32:00.000Z", now)).toBe("Oppdatert 14:32 · utdatert");
  });
  it("error", () => {
    expect(formatFreshness("error", "2026-10-20T12:32:00.000Z", now)).toBe("Sist oppdatert 14:32");
    expect(formatFreshness("error", null, now)).toBe("Aldri oppdatert");
  });
  it("not_configured", () => {
    expect(formatFreshness("not_configured", null, now)).toBe("Ingen data ennå");
  });
  it("previous day and older", () => {
    expect(formatFreshness("fresh", "2026-10-19T12:32:00.000Z", now)).toBe("Oppdatert i går 14:32");
    expect(formatFreshness("fresh", "2026-10-16T12:32:00.000Z", now)).toBe("Oppdatert fredag 14:32");
  });
});

describe("isOffline", () => {
  it("threshold 60 s from last success", () => {
    expect(isOffline({ lastSuccessAt: 1000, nowLocal: 1000 + 59_000, startedAt: 0 })).toBe(false);
    expect(isOffline({ lastSuccessAt: 1000, nowLocal: 1000 + 61_000, startedAt: 0 })).toBe(true);
  });
  it("never succeeded: measured from startedAt", () => {
    expect(isOffline({ lastSuccessAt: 0, nowLocal: 61_000, startedAt: 0 })).toBe(true);
    expect(isOffline({ lastSuccessAt: 0, nowLocal: 30_000, startedAt: 0 })).toBe(false);
  });
});
