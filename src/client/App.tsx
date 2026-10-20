import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UnpairedError } from "./api";
import { useSnapshot } from "./hooks/useSnapshot";
import { useAutoReload } from "./hooks/useAutoReload";
import { useWakeLock } from "./hooks/useWakeLock";
import { DisplayScreen } from "./features/display/DisplayScreen";
import { PairingScreen } from "./features/pairing/PairingScreen";

export function App() {
  useWakeLock();
  const queryClient = useQueryClient();
  // Start on the clock; only an exact 401 shows pairing (network errors, 5xx and 429 never do).
  const [unpaired, setUnpaired] = useState(false);
  const query = useSnapshot({ enabled: !unpaired });
  const onPaired = useCallback(() => setUnpaired(false), []);

  useEffect(() => {
    if (query.error instanceof UnpairedError) {
      setUnpaired(true);
      // Drop private data from memory.
      queryClient.removeQueries({ queryKey: ["snapshot"] });
    }
  }, [query.error, queryClient]);

  useAutoReload({
    serverVersion: query.data?.version,
    lastSuccessAt: query.dataUpdatedAt,
    watchdog: !unpaired,
  });

  if (unpaired) return <PairingScreen onPaired={onPaired} />;
  return <DisplayScreen query={query} />;
}
