import { describe, expect, it } from "vitest";
import { dayDriftOffset, nightDriftOffset } from "./drift";

describe("drift", () => {
  it("keeps night offsets in bounds and moving", () => {
    let moved = 0;
    for (let i = 0; i <= 1000; i++) {
      const o = nightDriftOffset(i);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(96);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(64);
      const n = nightDriftOffset(i + 1);
      if (n.x !== o.x || n.y !== o.y) moved++;
    }
    expect(moved).toBeGreaterThan(990);
  });
  it("keeps day offsets within 8px in multiples of 4", () => {
    for (let i = 0; i <= 1000; i++) {
      const o = dayDriftOffset(i);
      for (const v of [o.x, o.y]) {
        expect(Math.abs(v)).toBeLessThanOrEqual(8);
        expect(v % 4 === 0).toBe(true);
      }
    }
  });
});
