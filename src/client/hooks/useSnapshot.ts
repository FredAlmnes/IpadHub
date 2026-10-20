import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSnapshot, UnpairedError } from "../api";
import type { Snapshot } from "../../shared/contract";

export function useSnapshot(opts: { enabled: boolean }): UseQueryResult<Snapshot, Error> {
  return useQuery({
    queryKey: ["snapshot"],
    queryFn: ({ signal }) => fetchSnapshot(AbortSignal.any([signal, AbortSignal.timeout(10000)])),
    enabled: opts.enabled,
    refetchInterval: 30000,
    retry: (_count, err) => !(err instanceof UnpairedError),
    staleTime: 0,
    gcTime: Infinity,
  });
}
