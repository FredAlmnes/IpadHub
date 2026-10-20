import { useEffect } from "react";
import type { SnapshotQuery } from "../../hooks/useSnapshot";
import { useDrift } from "../../hooks/useDrift";
import { useNightMode } from "../../hooks/useNightMode";
import { DEFAULT_NIGHT } from "../../lib/night-mode";
import { Clock } from "./Clock";
import { ModuleGrid } from "./ModuleGrid";
import { NightClock } from "./NightClock";
import { OfflineMarker } from "./OfflineMarker";

const FADE_TO_NIGHT_MS = 3000;
const FADE_WAKE_IN_MS = 600;

// Opacity fade, then visibility flips to hidden after the fade so nothing private stays visible.
function layerStyle(visible: boolean, durationMs: number): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    visibility: visible ? "visible" : "hidden",
    transition: visible
      ? `opacity ${durationMs}ms ease-in-out, visibility 0s linear 0s`
      : `opacity ${durationMs}ms ease-in-out, visibility 0s linear ${durationMs}ms`,
  };
}

export function DisplayScreen({ query }: { query: SnapshotQuery }) {
  // Works offline: falls back to the hard-coded window when no snapshot has arrived.
  const cfg = query.data?.config ?? DEFAULT_NIGHT;
  const { mode, wake, waking } = useNightMode(cfg);
  const drift = useDrift("day");

  useEffect(() => {
    if (mode !== "night") return;
    const onPointerDown = () => wake();
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mode, wake]);

  const day = mode === "day";
  // Day layer fades in over 600 ms when tapped awake, otherwise (morning) 3000 ms; out is always 3000 ms.
  const dayMs = day ? (waking ? FADE_WAKE_IN_MS : FADE_TO_NIGHT_MS) : FADE_TO_NIGHT_MS;
  const nightMs = day ? (waking ? FADE_WAKE_IN_MS : FADE_TO_NIGHT_MS) : FADE_TO_NIGHT_MS;

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg font-sans text-text">
      <div className="absolute inset-0" style={layerStyle(day, dayMs)} aria-hidden={!day}>
        <div
          className="h-full w-full"
          style={{ transform: `translate(${drift.x}px, ${drift.y}px)`, transition: "transform 30s ease-in-out" }}
        >
          <main className="grid h-dvh w-screen grid-cols-12 gap-8 p-12">
            <section className="col-span-5 flex flex-col justify-center">
              <Clock />
            </section>
            <section className="col-span-7" data-region="modules">
              <ModuleGrid query={query} />
            </section>
          </main>
          <OfflineMarker query={query} />
        </div>
      </div>
      <div className="absolute inset-0" style={layerStyle(!day, nightMs)} aria-hidden={day}>
        <NightClock />
      </div>
    </div>
  );
}
