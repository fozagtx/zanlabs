import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { syncMarket, toViews } from "@/lib/markets";
import { creatorRecord } from "@/lib/leaderboard";

// Creator dashboard: every market with attributed activity and the
// share → visit → trade funnel per channel. Only real, recorded events.

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  if (user.role !== "creator") throw new HttpError(403, "NOT_CREATOR");
  const db = await getDb();
  let rows = await db
    .select()
    .from(schema.markets)
    .where(eq(schema.markets.creatorId, user.id))
    .orderBy(desc(schema.markets.createdAt))
    .limit(100);
  rows = await Promise.all(rows.map((r) => (r.status === "live" || r.status === "closed" ? syncMarket(r) : Promise.resolve(r))));
  const live = rows.filter((r) => r.status !== "draft");
  const views = await toViews(live);
  const ids = live.map((r) => r.id);

  const stats = ids.length
    ? await db
        .select({
          m: schema.trades.marketId,
          buys: count(),
          wallets: sql<number>`count(distinct ${schema.trades.wallet})`,
          volume: sql<string>`coalesce(sum(${schema.trades.amountUsdc}), 0)`,
        })
        .from(schema.trades)
        .where(and(inArray(schema.trades.marketId, ids), eq(schema.trades.kind, "buy"), isNull(schema.trades.excludedReason)))
        .groupBy(schema.trades.marketId)
    : [];
  const shares = ids.length
    ? await db
        .select({ m: schema.shareEvents.marketId, channel: schema.shareEvents.channel, event: schema.shareEvents.event, n: count() })
        .from(schema.shareEvents)
        .where(inArray(schema.shareEvents.marketId, ids))
        .groupBy(schema.shareEvents.marketId, schema.shareEvents.channel, schema.shareEvents.event)
    : [];
  const tradesByChannel = ids.length
    ? await db
        .select({ m: schema.trades.marketId, channel: schema.trades.refChannel, n: count() })
        .from(schema.trades)
        .where(and(inArray(schema.trades.marketId, ids), eq(schema.trades.kind, "buy"), isNull(schema.trades.excludedReason)))
        .groupBy(schema.trades.marketId, schema.trades.refChannel)
    : [];

  const funnel: Record<string, { shares: number; visits: number; trades: number }> = {};
  const bump = (ch: string | null, key: "shares" | "visits" | "trades", n: number) => {
    const k = ch ?? "direct";
    funnel[k] ??= { shares: 0, visits: 0, trades: 0 };
    funnel[k][key] += n;
  };
  for (const s of shares) bump(s.channel, s.event === "share" ? "shares" : "visits", Number(s.n));
  for (const t of tradesByChannel) bump(t.channel, "trades", Number(t.n));

  const perMarket = views.map((v) => {
    const s = stats.find((x) => x.m === v.id);
    return {
      market: v,
      buys: Number(s?.buys ?? 0),
      uniqueWallets: Number(s?.wallets ?? 0),
      volumeUsdc: Number(s?.volume ?? 0),
      shares: shares.filter((x) => x.m === v.id && x.event === "share").reduce((a, x) => a + Number(x.n), 0),
      visits: shares.filter((x) => x.m === v.id && x.event === "visit").reduce((a, x) => a + Number(x.n), 0),
    };
  });

  const totals = perMarket.reduce(
    (a, p) => ({
      markets: a.markets + 1,
      buys: a.buys + p.buys,
      volumeUsdc: a.volumeUsdc + p.volumeUsdc,
      shares: a.shares + p.shares,
      visits: a.visits + p.visits,
    }),
    { markets: 0, buys: 0, volumeUsdc: 0, shares: 0, visits: 0 },
  );
  const uniq = ids.length
    ? await db
        .select({ n: sql<number>`count(distinct ${schema.trades.wallet})` })
        .from(schema.trades)
        .where(and(inArray(schema.trades.marketId, ids), eq(schema.trades.kind, "buy"), isNull(schema.trades.excludedReason)))
    : [{ n: 0 }];

  return json({
    markets: perMarket,
    drafts: rows.filter((r) => r.status === "draft").map((r) => ({ id: r.id, slug: r.slug, question: r.question, createdAt: r.createdAt })),
    totals: { ...totals, uniqueWallets: Number(uniq[0]?.n ?? 0) },
    funnel,
    record: await creatorRecord(user.id),
  });
});
