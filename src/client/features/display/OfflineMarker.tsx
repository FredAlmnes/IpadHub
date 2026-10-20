import { useEffect, useRef, useState } from "react";
import { WifiOffIcon } from "../../icons";
import type { SnapshotQuery } from "../../hooks/useSnapshot";
import { isOffline } from "../../lib/staleness";

export function OfflineMarker({ query }: { query: SnapshotQuery }) {
  const startedAt = useRef(Date.now());
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  // Re-evaluate immediately when a new success arrives.
  const nowLocal = Math.max(tick, query.dataUpdatedAt);
  if (!isOffline({ lastSuccessAt: query.dataUpdatedAt, nowLocal, startedAt: startedAt.current })) return null;

  return (
    <div className="absolute right-12 top-12 flex items-center gap-2 text-label text-muted">
      <WifiOffIcon size={24} />
      <span>Frakoblet</span>
    </div>
  );
}
