import { and, asc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/client";
import { devices } from "../db/schema";

// Every query is scoped by user_id (multi-user ready, T-01-23).

export async function listActiveDevices(
  db: Db,
  userId: string,
): Promise<{ id: string; name: string; lastSeenAt: number }[]> {
  return db
    .select({ id: devices.id, name: devices.name, lastSeenAt: devices.lastSeenAt })
    .from(devices)
    .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)))
    .orderBy(asc(devices.createdAt));
}

export async function getActiveDevice(
  db: Db,
  userId: string,
  id: string,
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: devices.id, name: devices.name })
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId), isNull(devices.revokedAt)))
    .limit(1);
  return row ?? null;
}

export async function revokeDevice(db: Db, userId: string, id: string, now: number): Promise<boolean> {
  const updated = await db
    .update(devices)
    .set({ revokedAt: now })
    .where(and(eq(devices.id, id), eq(devices.userId, userId), isNull(devices.revokedAt)))
    .returning({ id: devices.id });
  return updated.length === 1;
}
