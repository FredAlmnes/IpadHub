import { useCallback, useEffect, useState } from "react";
import { osloMinutesOfDay } from "../../shared/oslo-time";
import { resolveMode, WAKE_HOLD_MS } from "../lib/night-mode";
import { setWakeUntil } from "../lib/wake-window";
import { useNow } from "./useNow";

export function useNightMode(cfg: { nightStart: string; nightEnd: string }): {
  mode: "day" | "night";
  wake: () => void;
  waking: boolean;
} {
  const now = useNow();
  const [wakeUntilMs, setWakeUntilMs] = useState(0);

  const nowMs = Date.now();
  const mode = resolveMode({
    minutesOfDay: osloMinutesOfDay(now),
    nightStart: cfg.nightStart,
    nightEnd: cfg.nightEnd,
    nowMs,
    wakeUntilMs,
  });
  const waking = wakeUntilMs > nowMs;

  const wake = useCallback(() => {
    const until = Date.now() + WAKE_HOLD_MS;
    setWakeUntil(until);
    setWakeUntilMs(until);
  }, []);

  // Re-evaluate exactly when the hold ends so the return to night does not wait for the minute tick.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (wakeUntilMs <= Date.now()) return;
    const t = setTimeout(() => setTick((n) => n + 1), wakeUntilMs - Date.now() + 20);
    return () => clearTimeout(t);
  }, [wakeUntilMs]);

  return { mode, wake, waking };
}
