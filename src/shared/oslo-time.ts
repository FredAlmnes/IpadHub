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

export function osloDateKey(d: Date): string {
  const p = osloParts(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}
