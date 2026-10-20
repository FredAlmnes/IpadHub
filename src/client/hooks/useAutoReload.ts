import { useEffect, useRef } from "react";
import { useNow } from "./useNow";
import { getWakeUntil } from "../lib/wake-window";
import { osloDateKey, osloMinutesOfDay } from "../../shared/oslo-time";
import { shouldDailyReload, shouldVersionReload, shouldWatchdogReload } from "../lib/reload-guard";

const LAST_RELOAD_KEY = "ipadhub.lastReloadAt";
const LAST_DAILY_KEY = "ipadhub.lastDailyReload";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the reload still happens
  }
}

function readLastReloadAt(): number | null {
  const raw = readStorage(LAST_RELOAD_KEY);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function reload(dailyKey?: string): void {
  writeStorage(LAST_RELOAD_KEY, String(Date.now()));
  if (dailyKey) writeStorage(LAST_DAILY_KEY, dailyKey);
  location.reload();
}

// Pass lastSuccessAt = 0 when unpaired to skip the watchdog (nothing to fetch).
export function useAutoReload(p: { serverVersion: string | undefined; lastSuccessAt: number; watchdog?: boolean }): void {
  const startedAt = useRef(Date.now());
  const now = useNow();
  const watchdog = p.watchdog ?? true;

  // Minute tick: daily + watchdog.
  useEffect(() => {
    const nowMs = Date.now();
    if (
      shouldDailyReload({
        osloDateKey: osloDateKey(now),
        minutesOfDay: osloMinutesOfDay(now),
        lastDailyKey: readStorage(LAST_DAILY_KEY),
        wakeWindowOpen: getWakeUntil() > nowMs,
      })
    ) {
      reload(osloDateKey(now));
      return;
    }
    if (
      watchdog &&
      shouldWatchdogReload({
        lastSuccessAt: p.lastSuccessAt,
        startedAt: startedAt.current,
        now: nowMs,
        online: navigator.onLine !== false,
        lastReloadAt: readLastReloadAt(),
      })
    ) {
      reload();
    }
  }, [now, p.lastSuccessAt, watchdog]);

  // Version change.
  useEffect(() => {
    if (
      shouldVersionReload({
        clientBuild: __BUILD_ID__,
        serverVersion: p.serverVersion,
        lastReloadAt: readLastReloadAt(),
        now: Date.now(),
      })
    ) {
      reload();
    }
  }, [p.serverVersion]);
}
