import type { SnapshotQuery } from "../../hooks/useSnapshot";
import { ModuleFrame } from "./ModuleFrame";
import { PlaceholderModule } from "./PlaceholderModule";

const SLOTS = [
  { key: "bus", label: "Buss" },
  { key: "weather", label: "Vær" },
  { key: "calendar", label: "Kalender" },
  { key: "mail", label: "E-post" },
] as const;

// Phase 1 has no module renderers; phases 2-4 swap PlaceholderModule for per-key components.
export function ModuleGrid({ query }: { query: SnapshotQuery }) {
  const snap = query.data;
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-8">
      {SLOTS.map(({ key, label }) => (
        <ModuleFrame
          key={key}
          label={label}
          module={snap?.modules[key]}
          serverTime={snap?.serverTime}
          receivedAtLocal={query.receivedAtLocal}
        >
          <PlaceholderModule />
        </ModuleFrame>
      ))}
    </div>
  );
}
