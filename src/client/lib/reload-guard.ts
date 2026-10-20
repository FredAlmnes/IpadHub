// Pure reload decisions (DISP-09). Every reload path shares the 10-minute guard so a
// misbehaving server value can never cause a reload loop.
export const RELOAD_GUARD_MS = 600000; // 10 minutes
export const WATCHDOG_MS = 900000; // 15 minutes
export const DAILY_RELOAD_MINUTE = 210; // 03:30 Oslo
const DAILY_WINDOW_END_MINUTE = 360; // 06:00: missed 03:30 can still be caught up before this

export function canReload(lastReloadAt: number | null, now: number): boolean {
  return lastReloadAt === null || now - lastReloadAt > RELOAD_GUARD_MS;
}

export function shouldVersionReload(p: {
  clientBuild: string;
  serverVersion: string | undefined;
  lastReloadAt: number | null;
  now: number;
}): boolean {
  if (p.serverVersion === undefined || p.serverVersion === p.clientBuild) return false;
  return canReload(p.lastReloadAt, p.now);
}

export function shouldDailyReload(p: {
  osloDateKey: string;
  minutesOfDay: number;
  lastDailyKey: string | null;
  wakeWindowOpen: boolean;
}): boolean {
  if (p.wakeWindowOpen) return false;
  if (p.lastDailyKey === p.osloDateKey) return false;
  return p.minutesOfDay >= DAILY_RELOAD_MINUTE && p.minutesOfDay < DAILY_WINDOW_END_MINUTE;
}

export function shouldWatchdogReload(p: {
  lastSuccessAt: number;
  startedAt: number;
  now: number;
  online: boolean;
  lastReloadAt: number | null;
}): boolean {
  if (!p.online) return false;
  if (p.now - Math.max(p.lastSuccessAt, p.startedAt) <= WATCHDOG_MS) return false;
  return canReload(p.lastReloadAt, p.now);
}
