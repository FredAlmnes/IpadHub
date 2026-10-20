import { useEffect } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSnapshot, UnpairedError } from "../api";
import type { Snapshot } from "../../shared/contract";

export type SnapshotQuery = UseQueryResult<Snapshot, Error> & { receivedAtLocal: number };

export function useSnapshot(opts: { enabled: boolean }): SnapshotQuery {
  const query = useQuery({
    queryKey: ["snapshot"],
    queryFn: ({ signal }) => fetchSnapshot(AbortSignal.any([signal, AbortSignal.timeout(10000)])),
    enabled: opts.enabled,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    // iOS navigator.onLine is unreliable: always attempt the request.
    networkMode: "always",
    retry: (_count, err) => !(err instanceof UnpairedError),
    retryDelay: (n) => Math.min(30000, 1000 * 2 ** n) * (0.5 + Math.random()),
    staleTime: 0,
    gcTime: Infinity,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const { refetch } = query;
  useEffect(() => {
    if (!opts.enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    const onOnline = () => void refetch();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [opts.enabled, refetch]);

  // dataUpdatedAt is the local time of the last successful fetch; state is replaced, never appended.
  return { ...query, receivedAtLocal: query.dataUpdatedAt } as SnapshotQuery;
}
