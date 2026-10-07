import "server-only";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { LEADERBOARD_MIN_CALLS } from "./config";

// Per-creator leaderboards rank fans by accuracy on resolved markets (paid
// picks and free calls), never by money. Restricted, team and creator wallets
// are excluded. "Beat the creator" counts calls that went against the
// creator's public call and were right.

export type LeaderRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  calls: number;
  correct: number;
  accuracy: number;
  beatCreator: number;
};

export async function creatorLeaderboard(creatorId: string): Promise<LeaderRow[]> {
  const db = await getDb();
  const resolved = await db
    .select({ id: schema.markets.id, outcome: schema.markets.outcome, call: schema.markets.creatorCall })
    .from(schema.markets)
    .where(and(eq(schema.markets.creatorId, creatorId), isNotNull(schema.markets.outcome)));
  const decided = resolved.filter((m) => m.outcome === "yes" || m.outcome === "no");
  if (!decided.length) return [];
  const ids = decided.map((m) => m.id);
  const byId = new Map(decided.map((m) => [m.id, m]));

  const restricted = await db
    .select({ w: schema.restrictedTraders.wallet })
    .from(schema.restrictedTraders)
    .where(eq(schema.restrictedTraders.creatorId, creatorId));
  const blocked = new Set([...restricted.map((r) => r.w), ...env.excludedWallets()]);

  const picks = await db
    .select({ userId: schema.trades.userId, marketId: schema.trades.marketId, side: schema.trades.side, wallet: schema.trades.wallet })
    .from(schema.trades)
    .where(and(inArray(schema.trades.marketId, ids), eq(schema.trades.kind, "buy"), isNull(schema.trades.excludedReason)));
  const calls = await db
    .select({ userId: schema.forecasts.userId, marketId: schema.forecasts.marketId, side: schema.forecasts.side })
    .from(schema.forecasts)
    .where(inArray(schema.forecasts.marketId, ids));

  // One decision per (user, market): a paid pick wins over a free call; holding both sides counts as no call.
  const decisions = new Map<string, { userId: string; marketId: string; side: string | null }>();
  for (const p of picks) {
    if (!p.userId || !p.marketId || blocked.has(p.wallet) || p.userId === creatorId) continue;
    const k = `${p.userId}:${p.marketId}`;
    const prev = decisions.get(k);
    decisions.set(k, { userId: p.userId, marketId: p.marketId, side: prev && prev.side !== p.side ? null : p.side });
  }
  for (const c of calls) {
    if (c.userId === creatorId) continue;
    const k = `${c.userId}:${c.marketId}`;
    if (!decisions.has(k)) decisions.set(k, { userId: c.userId, marketId: c.marketId, side: c.side });
  }

  const agg = new Map<string, { calls: number; correct: number; beat: number }>();
  for (const d of decisions.values()) {
    if (!d.side) continue;
    const m = byId.get(d.marketId)!;
    const a = agg.get(d.userId) ?? { calls: 0, correct: 0, beat: 0 };
    a.calls++;
    if (d.side === m.outcome) {
      a.correct++;
      if (m.call && m.call !== m.outcome) a.beat++;
    }
    agg.set(d.userId, a);
  }
  const eligible = [...agg.entries()].filter(([, a]) => a.calls >= LEADERBOARD_MIN_CALLS);
  if (!eligible.length) return [];
  const users = await db
    .select({ id: schema.users.id, handle: schema.users.handle, displayName: schema.users.displayName, refCode: schema.users.refCode, avatarUrl: schema.users.avatarUrl })
    .from(schema.users)
    .where(inArray(schema.users.id, eligible.map(([id]) => id)));
  const uMap = new Map(users.map((u) => [u.id, u]));
  return eligible
    .map(([userId, a]) => {
      const u = uMap.get(userId);
      return {
        userId,
        name: u?.handle ? `@${u.handle}` : u?.displayName || `fan-${u?.refCode ?? "?"}`,
        avatarUrl: u?.avatarUrl ?? null,
        calls: a.calls,
        correct: a.correct,
        accuracy: a.correct / a.calls,
        beatCreator: a.beat,
      };
    })
    .sort((x, y) => y.accuracy - x.accuracy || y.correct - x.correct || y.beatCreator - x.beatCreator)
    .slice(0, 25);
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
