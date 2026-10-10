import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { HttpError } from "./http";
import type { UserRow } from "./auth";

export async function requireCreator(user: UserRow) {
  if (user.role !== "creator" || !user.handle) throw new HttpError(403, "NOT_CREATOR");
  const db = await getDb();
  const profile = await db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, user.id) });
  if (!profile) throw new HttpError(403, "NOT_CREATOR");
  const socials = await db
    .select({ username: schema.socialAccounts.username })
    .from(schema.socialAccounts)
    .where(eq(schema.socialAccounts.userId, user.id));
  const usernames = [user.handle, ...socials.map((s) => s.username)].filter(Boolean).map((s) => s!.toLowerCase());
  return { profile, usernames };
}

/** The creator's own record on resolved markets where they made a public call. */
export async function creatorRecord(creatorId: string): Promise<{ calls: number; correct: number }> {
  const db = await getDb();
  const rows = await db
    .select({ outcome: schema.markets.outcome, call: schema.markets.creatorCall })
    .from(schema.markets)
    .where(and(eq(schema.markets.creatorId, creatorId), isNotNull(schema.markets.outcome), isNotNull(schema.markets.creatorCall)));
  const decided = rows.filter((r) => r.outcome === "yes" || r.outcome === "no");
  return { calls: decided.length, correct: decided.filter((r) => r.outcome === r.call).length };
}
