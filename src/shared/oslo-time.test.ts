import { describe, expect, it } from "vitest";
import { osloClock, osloDateKey } from "./oslo-time";

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
