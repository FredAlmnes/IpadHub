import { describe, expect, it } from "vitest";
import { inNight, parseHm, resolveMode } from "./night-mode";

describe("inNight", () => {
  const s = 23 * 60;
  const e = 6 * 60;
  it("wraps midnight", () => {
    expect(inNight(22 * 60 + 59, s, e)).toBe(false);
    expect(inNight(s, s, e)).toBe(true);
    expect(inNight(180, s, e)).toBe(true);
    expect(inNight(5 * 60 + 59, s, e)).toBe(true);
    expect(inNight(e, s, e)).toBe(false);
  });
  it("handles a non-wrapping window", () => {
    expect(inNight(59, 60, 300)).toBe(false);
    expect(inNight(60, 60, 300)).toBe(true);
    expect(inNight(300, 60, 300)).toBe(false);
  });
});

describe("parseHm", () => {
  it("parses strictly", () => {
    expect(parseHm("23:00")).toBe(1380);
    expect(parseHm("6:00")).toBeNull();
    expect(parseHm("24:00")).toBeNull();
    expect(parseHm("xx")).toBeNull();
  });
});

describe("resolveMode", () => {
  const base = { minutesOfDay: 23 * 60 + 30, nightStart: "23:00", nightEnd: "06:00", nowMs: 1000, wakeUntilMs: 0 };
  it("is night inside the window", () => {
    expect(resolveMode(base)).toBe("night");
  });
  it("is day while woken", () => {
    expect(resolveMode({ ...base, wakeUntilMs: 2000 })).toBe("day");
    expect(resolveMode({ ...base, wakeUntilMs: 1000 })).toBe("night");
  });
  it("falls back to defaults on invalid config", () => {
    expect(resolveMode({ ...base, nightStart: "xx" })).toBe("night");
    expect(resolveMode({ ...base, nightStart: "xx", minutesOfDay: 12 * 60 })).toBe("day");
  });
});
