// All display time is composed from formatToParts in Europe/Oslo. Never toLocaleTimeString
// and never hour12:false (which can yield "24:00").

export function osloParts(d: Date, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", ...opts }).formatToParts(d);
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

export function osloClock(d: Date): string {
  const p = osloParts(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.hour}:${p.minute}`;
}

export function osloYmd(d: Date): { y: number; m: number; d: number } {
  const p = osloParts(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

export function osloMinutesOfDay(d: Date): number {
  const p = osloParts(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return Number(p.hour) * 60 + Number(p.minute);
}

// ISO 8601 week number (Thursday algorithm) for a calendar date.
export function isoWeek(ymd: { y: number; m: number; d: number }): number {
  const date = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
  const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // Thursday of this week
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
}

export function osloDateLabel(d: Date): string {
  const p = osloParts(d, { weekday: "long", day: "numeric", month: "long" });
  return `${p.weekday} ${p.day}. ${p.month}`.toLowerCase();
}

export function osloDateKey(d: Date): string {
  const p = osloParts(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}
