import "server-only";
import { PrivyClient } from "@privy-io/node";
import { and, eq } from "drizzle-orm";
import { env } from "./env";
import { getDb, schema } from "./db";
import { HttpError } from "./http";
import { shortId } from "./ids";

// Authentication: the client sends its Privy access token as a Bearer token.
// We verify it locally (JWKS), map the Privy DID to our user row, and sync
// linked wallets and social accounts from Privy when asked.

export type UserRow = typeof schema.users.$inferSelect;

let client: PrivyClient | undefined;
function privy(): PrivyClient {
  const appId = env.privyAppId();
  const appSecret = env.privySecret();
  if (!appId || !appSecret) throw new HttpError(503, "AUTH_NOT_CONFIGURED");
  client ??= new PrivyClient({ appId, appSecret });
  return client;
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export async function verifyRequest(req: Request): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  try {
    const claims = await privy().utils().auth().verifyAccessToken(token);
    return claims.user_id;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return null;
  }
}

async function findOrCreateUser(privyDid: string): Promise<UserRow> {
  const db = await getDb();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.privyDid, privyDid) });
  if (existing) return existing;
  for (let i = 0; i < 3; i++) {
    const [row] = await db
      .insert(schema.users)
      .values({ privyDid, refCode: shortId(6) })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    const again = await db.query.users.findFirst({ where: eq(schema.users.privyDid, privyDid) });
    if (again) return again;
  }
  throw new HttpError(500, "INTERNAL", "Could not create your account.");
}

/** Returns the signed-in user or null. Creates the row on first sight. */
export async function getUser(req: Request): Promise<UserRow | null> {
  const did = await verifyRequest(req);
  if (!did) return null;
  const user = await findOrCreateUser(did);
  if (user.bannedAt) throw new HttpError(403, "FORBIDDEN", "This account is suspended.");
  return user;
}

export async function requireUser(req: Request): Promise<UserRow> {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "AUTH_REQUIRED");
  return user;
}

type AnyLinked = { type: string; [k: string]: unknown };

/** Pull wallets and verified socials from Privy into our tables. */
export async function syncFromPrivy(user: UserRow): Promise<UserRow> {
  const remote = await privy().users()._get(user.privyDid);
  const accounts = (remote.linked_accounts ?? []) as unknown as AnyLinked[];
  const db = await getDb();

  const solWallets = accounts.filter((a) => a.type === "wallet" && a.chain_type === "solana" && typeof a.address === "string");
  for (const w of solWallets) {
    const kind = w.connector_type === "embedded" || w.wallet_client_type === "privy" ? "embedded" : "external";
    await db
      .insert(schema.wallets)
      .values({ address: w.address as string, userId: user.id, kind })
      .onConflictDoNothing();
  }

  const socialMap: Record<string, "x" | "instagram" | "tiktok"> = {
    twitter_oauth: "x",
    instagram_oauth: "instagram",
    tiktok_oauth: "tiktok",
  };
  let avatar: string | null = null;
  let name: string | null = null;
  for (const a of accounts) {
    const provider = socialMap[a.type];
    if (!provider || typeof a.subject !== "string") continue;
    const username = typeof a.username === "string" ? a.username : null;
    const pic = typeof a.profile_picture_url === "string" ? a.profile_picture_url : null;
    if (provider === "x") {
      avatar = pic;
      name = typeof a.name === "string" ? a.name : null;
    }
    await db
      .insert(schema.socialAccounts)
      .values({ provider, subject: a.subject, userId: user.id, username, profilePictureUrl: pic })
      .onConflictDoUpdate({
        target: [schema.socialAccounts.provider, schema.socialAccounts.subject],
        set: { username, profilePictureUrl: pic, userId: user.id },
      });
  }

  const patch: Partial<UserRow> = {};
  if (!user.avatarUrl && avatar) patch.avatarUrl = avatar;
  if (!user.displayName && name) patch.displayName = name;
  if (!user.activeWallet) {
    const embedded = solWallets.find((w) => w.connector_type === "embedded" || w.wallet_client_type === "privy");
    const first = embedded ?? solWallets[0];
    if (first) patch.activeWallet = first.address as string;
  }
  if (Object.keys(patch).length) {
    const [updated] = await db
      .update(schema.users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning();
    return updated;
  }
  return user;
}

/** Ensure the wallet belongs to the user; re-sync from Privy once if unknown. */
export async function assertWallet(user: UserRow, wallet: string): Promise<void> {
  const db = await getDb();
  const owned = await db.query.wallets.findFirst({
    where: and(eq(schema.wallets.address, wallet), eq(schema.wallets.userId, user.id)),
  });
  if (owned) return;
  await syncFromPrivy(user);
  const again = await db.query.wallets.findFirst({
    where: and(eq(schema.wallets.address, wallet), eq(schema.wallets.userId, user.id)),
  });
  if (!again) throw new HttpError(403, "WALLET_NOT_OWNED");
}

export async function userWallets(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ a: schema.wallets.address }).from(schema.wallets).where(eq(schema.wallets.userId, userId));
  return rows.map((r) => r.a);
}

export function publicName(u: Pick<UserRow, "handle" | "displayName" | "refCode">): string {
  return u.handle ? `@${u.handle}` : u.displayName || `fan-${u.refCode}`;
}
