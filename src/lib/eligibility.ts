import "server-only";
import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "./db";
import { HttpError } from "./http";
import { realMoneyAllowed } from "./geo";
import type { UserRow } from "./auth";
import { DEFAULT_DAILY_LIMIT, LIMIT_COOLING_OFF_HOURS, MAX_DAILY_LIMIT } from "./config";

// Real-money gates, checked on every quote: region, age attestation,
// restricted traders (creator + declared team wallets), and play limits.

export function assertRegionAndAge(user: UserRow, country: string | null) {
  if (!realMoneyAllowed(country)) throw new HttpError(403, "REGION_BLOCKED", undefined, { country });
  if (!user.ageAttestedAt) throw new HttpError(403, "AGE_REQUIRED");
}

export async function assertNotRestricted(user: UserRow, wallet: string, creatorId: string) {
  if (user.id === creatorId) throw new HttpError(403, "RESTRICTED_TRADER");
  const db = await getDb();
  const hit = await db.query.restrictedTraders.findFirst({
    where: and(eq(schema.restrictedTraders.creatorId, creatorId), eq(schema.restrictedTraders.wallet, wallet)),
  });
  if (hit) throw new HttpError(403, "RESTRICTED_TRADER");
  const creatorWallet = await db.query.wallets.findFirst({
    where: and(eq(schema.wallets.address, wallet), eq(schema.wallets.userId, creatorId)),
  });
  if (creatorWallet) throw new HttpError(403, "RESTRICTED_TRADER");
}

export type LimitsView = {
  dailyLimitUsdc: number;
  pendingLimitUsdc: number | null;
  pendingEffectiveAt: string | null;
  timeoutUntil: string | null;
  selfExcluded: boolean;
  spentTodayUsdc: number;
};

export async function getLimits(userId: string): Promise<LimitsView> {
  const db = await getDb();
  let row = await db.query.playLimits.findFirst({ where: eq(schema.playLimits.userId, userId) });
  if (!row) {
    [row] = await db
      .insert(schema.playLimits)
      .values({ userId, dailyLimitUsdc: String(DEFAULT_DAILY_LIMIT) })
      .onConflictDoNothing()
      .returning();
    row ??= await db.query.playLimits.findFirst({ where: eq(schema.playLimits.userId, userId) });
  }
  if (!row) throw new HttpError(500, "INTERNAL");
  // Apply a raised limit once its cooling-off period has passed.
  if (row.pendingLimitUsdc && row.pendingEffectiveAt && row.pendingEffectiveAt <= new Date()) {
    [row] = await db
      .update(schema.playLimits)
      .set({ dailyLimitUsdc: row.pendingLimitUsdc, pendingLimitUsdc: null, pendingEffectiveAt: null, updatedAt: new Date() })
      .where(eq(schema.playLimits.userId, userId))
      .returning();
  }
  return {
    dailyLimitUsdc: Number(row.dailyLimitUsdc),
    pendingLimitUsdc: row.pendingLimitUsdc ? Number(row.pendingLimitUsdc) : null,
    pendingEffectiveAt: row.pendingEffectiveAt?.toISOString() ?? null,
    timeoutUntil: row.timeoutUntil && row.timeoutUntil > new Date() ? row.timeoutUntil.toISOString() : null,
    selfExcluded: Boolean(row.selfExcludedAt),
    spentTodayUsdc: await spentToday(userId),
  };
}

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

// Everything that can still turn into a buy counts toward today's spend:
// live quotes (Panta quotes last ~90s), recently built transactions, and
// anything sent or confirmed.
async function spentToday(userId: string, tx?: Tx): Promise<number> {
  const db = tx ?? (await getDb());
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const recentQuote = new Date(Date.now() - 2 * 60_000);
  const recentBuild = new Date(Date.now() - 3 * 60_000);
  const [r] = await db
    .select({ total: sql<string>`coalesce(sum(${schema.txIntents.amountUsdc}), 0)` })
    .from(schema.txIntents)
    .where(
      and(
        eq(schema.txIntents.userId, userId),
        eq(schema.txIntents.kind, "buy"),
        gte(schema.txIntents.createdAt, start),
        or(
          inArray(schema.txIntents.status, ["sent", "confirmed"]),
          and(eq(schema.txIntents.status, "built"), gte(schema.txIntents.updatedAt, recentBuild)),
          and(eq(schema.txIntents.status, "quoted"), gte(schema.txIntents.createdAt, recentQuote)),
        ),
      ),
    );
  return Number(r?.total ?? 0);
}

function check(l: LimitsView, spent: number, amount: number) {
  if (l.selfExcluded) throw new HttpError(403, "SELF_EXCLUDED");
  if (l.timeoutUntil) throw new HttpError(403, "TIMED_OUT", undefined, { until: l.timeoutUntil });
  if (spent + amount > l.dailyLimitUsdc + 1e-9) {
    throw new HttpError(403, "DAILY_LIMIT", undefined, {
      remaining: Math.max(0, l.dailyLimitUsdc - spent),
      limit: l.dailyLimitUsdc,
    });
  }
}

/** Fast pre-check before asking Panta for a quote (not race-safe on its own). */
export async function assertWithinLimits(userId: string, amount: number) {
  const l = await getLimits(userId);
  check(l, l.spentTodayUsdc, amount);
}

/**
 * Race-safe limit check: serializes a user's spend decisions with a
 * transaction-scoped advisory lock, re-reads spend inside the lock, then runs
 * `fn` (which records the new intent) before the lock is released.
 * `amount` is the new money being committed (0 when re-checking an intent
 * that is already counted).
 */
export async function withinLimitsLocked<T>(userId: string, amount: number, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const l = await getLimits(userId);
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const spent = await spentToday(userId, tx);
    check(l, spent, amount);
    return fn(tx);
  });
}

/** Lowering a limit is immediate; raising it waits out the cooling-off period. */
export async function setDailyLimit(userId: string, next: number): Promise<LimitsView> {
  if (!(next >= 1 && next <= MAX_DAILY_LIMIT)) throw new HttpError(400, "BAD_REQUEST", `Limit must be between $1 and $${MAX_DAILY_LIMIT}.`);
  const current = await getLimits(userId);
  const db = await getDb();
  if (next <= current.dailyLimitUsdc) {
    await db
      .update(schema.playLimits)
      .set({ dailyLimitUsdc: String(next), pendingLimitUsdc: null, pendingEffectiveAt: null, updatedAt: new Date() })
      .where(eq(schema.playLimits.userId, userId));
  } else {
    await db
      .update(schema.playLimits)
      .set({
        pendingLimitUsdc: String(next),
        pendingEffectiveAt: new Date(Date.now() + LIMIT_COOLING_OFF_HOURS * 3600_000),
        updatedAt: new Date(),
      })
      .where(eq(schema.playLimits.userId, userId));
  }
  return getLimits(userId);
}

export async function setTimeout_(userId: string, hours: number | "forever"): Promise<LimitsView> {
  await getLimits(userId);
  const db = await getDb();
  if (hours === "forever") {
    await db.update(schema.playLimits).set({ selfExcludedAt: new Date(), updatedAt: new Date() }).where(eq(schema.playLimits.userId, userId));
  } else {
    await db
      .update(schema.playLimits)
      .set({ timeoutUntil: new Date(Date.now() + hours * 3600_000), updatedAt: new Date() })
      .where(eq(schema.playLimits.userId, userId));
  }
  return getLimits(userId);
}
