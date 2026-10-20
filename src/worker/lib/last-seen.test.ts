import { describe, expect, it } from "vitest";
import { formatLastSeen } from "./last-seen";

const now = Date.parse("2026-10-20T12:00:00Z"); // 14:00 Oslo

describe("formatLastSeen", () => {
  it("minutes under one hour", () => {
    expect(formatLastSeen(now - 3 * 60000, now)).toBe("Sist sett for 3 min siden");
    expect(formatLastSeen(now - 20000, now)).toBe("Sist sett for 1 min siden");
  });
  it("earlier today", () => {
    expect(formatLastSeen(Date.parse("2026-10-20T08:32:00Z"), now)).toBe("Sist sett i dag 10:32");
  });
  it("yesterday (Oslo date)", () => {
    expect(formatLastSeen(Date.parse("2026-10-19T19:05:00Z"), now)).toBe("Sist sett i går 21:05");
  });
  it("older", () => {
    expect(formatLastSeen(Date.parse("2026-10-12T07:10:00Z"), now)).toBe("Sist sett 12. okt. 09:10");
  });
  it("day boundaries use the Oslo date", () => {
    const n = Date.parse("2026-10-26T10:00:00Z");
    expect(formatLastSeen(Date.parse("2026-10-25T23:30:00Z"), n)).toBe("Sist sett i dag 00:30");
  });
});
