import { describe, expect, it } from "vitest";
import { isoWeek, osloClock, osloDateKey, osloDateLabel, osloMinutesOfDay, osloYmd } from "./oslo-time";

describe("isoWeek", () => {
  it.each([
    [{ y: 2026, m: 10, d: 19 }, 43],
    [{ y: 2026, m: 12, d: 31 }, 53],
    [{ y: 2027, m: 1, d: 1 }, 53],
    [{ y: 2027, m: 1, d: 3 }, 53],
    [{ y: 2027, m: 1, d: 4 }, 1],
    [{ y: 2025, m: 12, d: 29 }, 1],
  ])("%j -> %i", (ymd, week) => {
    expect(isoWeek(ymd)).toBe(week);
  });
});

describe("Oslo date helpers", () => {
  it("uses the Oslo calendar across the UTC midnight boundary", () => {
    const d = new Date("2026-10-25T23:30:00Z");
    expect(osloYmd(d)).toEqual({ y: 2026, m: 10, d: 26 });
    expect(isoWeek(osloYmd(d))).toBe(44);
    expect(osloDateLabel(d)).toBe("mandag 26. oktober");
  });
  it("labels a normal day", () => {
    expect(osloDateLabel(new Date("2026-10-19T10:00:00Z"))).toBe("mandag 19. oktober");
  });
  it.each([
    ["2026-10-25T00:30:00Z", 150],
    ["2026-10-25T01:30:00Z", 150],
    ["2027-03-28T01:00:00Z", 180],
  ])("osloMinutesOfDay %s -> %i", (iso, m) => {
    expect(osloMinutesOfDay(new Date(iso))).toBe(m);
  });
});

describe("osloClock", () => {
  it.each([
    ["2026-10-24T22:30:00Z", "00:30"],
    ["2026-10-25T00:30:00Z", "02:30"],
    ["2026-10-25T01:30:00Z", "02:30"], // DST fall-back repeat
    ["2027-03-28T00:59:00Z", "01:59"],
    ["2027-03-28T01:00:00Z", "03:00"], // spring forward
    ["2026-10-19T22:00:00Z", "00:00"], // never "24:00"
  ])("%s -> %s", (iso, expected) => {
    expect(osloClock(new Date(iso))).toBe(expected);
  });
});

describe("osloDateKey", () => {
  it("uses the Oslo calendar date, not UTC", () => {
    expect(osloDateKey(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
  });
});
