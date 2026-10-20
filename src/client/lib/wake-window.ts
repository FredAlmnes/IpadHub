// Shared with the auto-reload logic (01-06): do not reload while the day view is held awake.
let wakeUntil = 0;

export function getWakeUntil(): number {
  return wakeUntil;
}

export function setWakeUntil(ms: number): void {
  wakeUntil = ms;
}
