import { useEffect } from "react";

// Keeps the screen awake. Fails silently: Auto-Lock = Never is the documented fallback.
export function useWakeLock(): void {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const acquire = async () => {
      if (!active || sentinel || document.visibilityState !== "visible") return;
      try {
        if (!("wakeLock" in navigator)) return;
        const s = await navigator.wakeLock.request("screen");
        if (!active) {
          void s.release().catch(() => undefined);
          return;
        }
        sentinel = s;
        s.addEventListener("release", () => {
          if (sentinel === s) sentinel = null;
        });
      } catch {
        sentinel = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    const onPointer = () => void acquire();

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", onPointer);
    const heartbeat = setInterval(() => void acquire(), 60000);

    return () => {
      active = false;
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onPointer);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);
}
