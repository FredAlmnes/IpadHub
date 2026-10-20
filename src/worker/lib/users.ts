import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { users } from "../db/schema";

export async function upsertUserByEmail(
  db: Db,
  input: { email: string; sub: string; now: number },
): Promise<{ id: string }> {
  const email = input.email.toLowerCase();
  const [existing] = await db
    .select({ id: users.id, googleSub: users.googleSub })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    if (!existing.googleSub) await db.update(users).set({ googleSub: input.sub }).where(eq(users.id, existing.id));
    return { id: existing.id };
  }
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email, googleSub: input.sub, createdAt: input.now });
  return { id };
}
