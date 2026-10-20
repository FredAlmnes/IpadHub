import { osloClock, osloDateKey, osloParts } from "../../shared/oslo-time";

const HOUR = 3600000;
const MINUTE = 60000;

// «Sist sett ...» in Europe/Oslo. Day boundaries use the Oslo calendar date, not 24 h windows.
export function formatLastSeen(lastSeenMs: number, nowMs: number): string {
  const age = Math.max(0, nowMs - lastSeenMs);
  if (age < HOUR) return `Sist sett for ${Math.max(1, Math.floor(age / MINUTE))} min siden`;

  const seen = new Date(lastSeenMs);
  const time = osloClock(seen);
  const seenKey = osloDateKey(seen);
  if (seenKey === osloDateKey(new Date(nowMs))) return `Sist sett i dag ${time}`;
  // Anything within the previous 48 h is either yesterday or the day before; compare keys.
  if (seenKey === osloDateKey(new Date(nowMs - 24 * HOUR))) return `Sist sett i går ${time}`;

  const p = osloParts(seen, { day: "numeric", month: "short" });
  return `Sist sett ${p.day}. ${p.month} ${time}`;
}
