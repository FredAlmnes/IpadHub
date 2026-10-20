export const DEFAULT_NIGHT = { nightStart: "23:00", nightEnd: "06:00" };
export const WAKE_HOLD_MS = 90000;

export function parseHm(hm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// start > end wraps past midnight.
export function inNight(minutes: number, start: number, end: number): boolean {
  if (start > end) return minutes >= start || minutes < end;
  return minutes >= start && minutes < end;
}

export function resolveMode(p: {
  minutesOfDay: number;
  nightStart: string;
  nightEnd: string;
  nowMs: number;
  wakeUntilMs: number;
}): "day" | "night" {
  const start = parseHm(p.nightStart) ?? (parseHm(DEFAULT_NIGHT.nightStart) as number);
  const end = parseHm(p.nightEnd) ?? (parseHm(DEFAULT_NIGHT.nightEnd) as number);
  if (!inNight(p.minutesOfDay, start, end)) return "day";
  return p.wakeUntilMs > p.nowMs ? "day" : "night";
}
