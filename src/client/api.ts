import { z } from "zod";
import { Snapshot } from "../shared/contract";

export class UnpairedError extends Error {
  constructor() {
    super("unpaired");
  }
}

export class HttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const pairStartSchema = z.object({
  code: z.string().regex(new RegExp(`^[${ALPHA}]{4}-[${ALPHA}]{4}$`)),
  pollSecret: z.string().min(1),
  expiresIn: z.number(),
});

export type PairStart = z.infer<typeof pairStartSchema>;

export type PollStatus = "pending" | "expired" | "consumed" | "approved";

export async function pollPairing(pollSecret: string): Promise<{ status: PollStatus }> {
  const res = await fetch("/api/pair/poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollSecret }),
    cache: "no-store",
    credentials: "same-origin",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new HttpError(res.status);
  return z.object({ status: z.enum(["pending", "expired", "consumed", "approved"]) }).parse(await res.json());
}

export async function fetchSnapshot(signal: AbortSignal): Promise<Snapshot> {
  const res = await fetch("/api/snapshot", { cache: "no-store", credentials: "same-origin", signal });
  if (res.status === 401) throw new UnpairedError();
  if (!res.ok) throw new HttpError(res.status);
  return Snapshot.parse(await res.json());
}

export async function startPairing(): Promise<PairStart> {
  const res = await fetch("/api/pair/start", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new HttpError(res.status);
  return pairStartSchema.parse(await res.json());
}
