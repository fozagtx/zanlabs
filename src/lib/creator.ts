import "server-only";
import { eq } from "drizzle-orm";
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
