import { and, count, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../db/client";
import { devices, pairingRequests } from "../db/schema";
import { formatPairingCode, generatePairingCode, normalizePairingCode, randomBase64Url, sha256Hex } from "./tokens";

export const PAIRING_TTL_MS = 600000;
export const MAX_PENDING = 20;
const CLEANUP_AFTER_MS = 3600000;
const POLL_SECRET_RE = /^[A-Za-z0-9_-]{43}$/;

export async function startPairing(
  db: Db,
  now: number,
): Promise<{ code: string; pollSecret: string; expiresIn: number } | "too_many"> {
  // Opportunistic cleanup keeps the table small on the free D1 tier.
  await db.delete(pairingRequests).where(lt(pairingRequests.expiresAt, now - CLEANUP_AFTER_MS));

  const [pending] = await db
    .select({ n: count() })
    .from(pairingRequests)
    .where(and(eq(pairingRequests.status, "pending"), gt(pairingRequests.expiresAt, now)));
  if ((pending?.n ?? 0) >= MAX_PENDING) return "too_many";

  for (let attempt = 0; attempt < 2; attempt++) {
    const code = generatePairingCode();
    const pollSecret = randomBase64Url(32);
    try {
      await db.insert(pairingRequests).values({
        id: crypto.randomUUID(),
        codeHash: await sha256Hex(code),
        pollSecretHash: await sha256Hex(pollSecret),
        status: "pending",
        expiresAt: now + PAIRING_TTL_MS,
        createdAt: now,
      });
      return { code: formatPairingCode(code), pollSecret, expiresIn: PAIRING_TTL_MS / 1000 };
    } catch (err) {
      // Retry once on a unique-constraint collision, otherwise rethrow.
      if (attempt === 1 || !String(err).concat(String((err as Error).cause)).includes("UNIQUE")) throw err;
    }
  }
  throw new Error("unreachable");
}

export type PollResult =
  | { status: "pending" | "expired" | "consumed" }
  | { status: "approved"; token: string; deviceId: string };

export async function pollPairing(db: Db, pollSecret: string, now: number): Promise<PollResult> {
  // Malformed and unknown secrets look identical (no oracle).
  if (!POLL_SECRET_RE.test(pollSecret)) return { status: "expired" };

  const [row] = await db
    .select()
    .from(pairingRequests)
    .where(eq(pairingRequests.pollSecretHash, await sha256Hex(pollSecret)))
    .limit(1);
  if (!row) return { status: "expired" };
  if (row.status === "consumed") return { status: "consumed" };
  if (row.status === "pending") {
    return { status: row.expiresAt <= now ? "expired" : "pending" };
  }

  // approved: claim exactly once.
  const claimed = await db
    .update(pairingRequests)
    .set({ status: "consumed" })
    .where(and(eq(pairingRequests.id, row.id), eq(pairingRequests.status, "approved")))
    .returning({ id: pairingRequests.id });
  if (claimed.length === 0 || !row.userId) return { status: "consumed" };

  const token = randomBase64Url(32);
  const deviceId = crypto.randomUUID();
  await db.insert(devices).values({
    id: deviceId,
    userId: row.userId,
    name: row.deviceName ?? "iPad",
    tokenHash: await sha256Hex(token),
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
  });
  return { status: "approved", token, deviceId };
}

export async function approvePairing(
  db: Db,
  input: { code: string; userId: string; deviceName: string; now: number },
): Promise<"approved" | "invalid"> {
  const code = normalizePairingCode(input.code);
  if (!code) return "invalid";
  const name = input.deviceName.trim();
  if (name.length < 1 || name.length > 40) return "invalid";

  const updated = await db
    .update(pairingRequests)
    .set({ status: "approved", userId: input.userId, deviceName: name })
    .where(
      and(
        eq(pairingRequests.codeHash, await sha256Hex(code)),
        eq(pairingRequests.status, "pending"),
        gt(pairingRequests.expiresAt, input.now),
      ),
    )
    .returning({ id: pairingRequests.id });
  return updated.length === 1 ? "approved" : "invalid";
}
