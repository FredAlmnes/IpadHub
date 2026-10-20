import type { ModuleSnapshot } from "../../shared/contract";
import { osloClock, osloDateKey, osloParts } from "../../shared/oslo-time";

export type ModuleView = "fresh" | "stale" | "error" | "not_configured";

const OFFLINE_AFTER_MS = 60_000;

export function moduleState(p: {
  module: ModuleSnapshot;
  serverTime: string;
  receivedAtLocal: number;
  nowLocal: number;
}): ModuleView {
  const { module: m } = p;
  if (m.status === "not_configured") return "not_configured";
  if (m.status === "error") return m.fetchedAt ? "stale" : "error";
  if (!m.fetchedAt) return "error";
  // Server-relative age at receive time plus local elapsed: immune to device clock skew.
  const ageSec = (Date.parse(p.serverTime) - Date.parse(m.fetchedAt)) / 1000 + (p.nowLocal - p.receivedAtLocal) / 1000;
  return ageSec > m.staleAfterSec ? "stale" : "fresh";
}

function previousDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

function whenLabel(fetchedAt: string, now: Date): string {
  const at = new Date(fetchedAt);
  const clock = osloClock(at);
  const atKey = osloDateKey(at);
  const nowKey = osloDateKey(now);
  if (atKey === nowKey) return clock;
  if (atKey === previousDateKey(nowKey)) return `i går ${clock}`;
  const weekday = osloParts(at, { weekday: "long" }).weekday.toLowerCase();
  return `${weekday} ${clock}`;
}

export function formatFreshness(view: ModuleView, fetchedAt: string | null, now: Date): string {
  if (view === "not_configured") return "Ingen data ennå";
  if (!fetchedAt) return "Aldri oppdatert";
  const when = whenLabel(fetchedAt, now);
  if (view === "fresh") return `Oppdatert ${when}`;
  if (view === "stale") return `Oppdatert ${when} · utdatert`;
  return `Sist oppdatert ${when}`;
}

export function isOffline(p: { lastSuccessAt: number; nowLocal: number; startedAt: number }): boolean {
  return p.nowLocal - Math.max(p.lastSuccessAt, p.startedAt) > OFFLINE_AFTER_MS;
}
