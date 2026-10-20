import { z } from "zod";

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
