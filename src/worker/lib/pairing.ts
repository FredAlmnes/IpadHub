import { and, count, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../db/client";
import { pairingRequests } from "../db/schema";
import { formatPairingCode, generatePairingCode, randomBase64Url, sha256Hex } from "./tokens";

export const PAIRING_TTL_MS = 600000;
export const MAX_PENDING = 20;
const CLEANUP_AFTER_MS = 3600000;

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
