import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { pantaApi, pantaConfigured } from "@/lib/panta/client";
import { usdcFromBase, toNumber } from "@/lib/panta/normalize";

// Public, honest traction numbers. Team/test wallets (EXCLUDED_WALLETS) are
// left out; Panta's own attribution totals are shown next to ours.
export const GET = route(async () => {
  const db = await getDb();
  const realBuys = and(eq(schema.trades.kind, "buy"), isNull(schema.trades.excludedReason));
  const [creators, live, total, buys, wallets, repeat, volume, calls, channels] = await Promise.all([
    db.select({ n: sql<number>`count(distinct ${schema.markets.creatorId})` }).from(schema.markets).where(ne(schema.markets.status, "draft")),
    db.select({ n: count() }).from(schema.markets).where(eq(schema.markets.status, "live")),
    db.select({ n: count() }).from(schema.markets).where(ne(schema.markets.status, "draft")),
    db.select({ n: count() }).from(schema.trades).where(realBuys),
    db.select({ n: sql<number>`count(distinct ${schema.trades.wallet})` }).from(schema.trades).where(realBuys),
    db.execute(sql`select count(*)::int as n from (select wallet from trades where kind = 'buy' and excluded_reason is null group by wallet having count(*) >= 2) t`),
    db.select({ v: sql<string>`coalesce(sum(${schema.trades.amountUsdc}), 0)` }).from(schema.trades).where(realBuys),
    db.select({ n: count() }).from(schema.forecasts),
    db
      .select({ channel: schema.trades.refChannel, n: count() })
      .from(schema.trades)
      .where(realBuys)
      .groupBy(schema.trades.refChannel),
  ]);
  const repeatRows = (repeat as unknown as { rows?: { n: number }[] }).rows ?? (repeat as unknown as { n: number }[]);

  let panta: { attributedVolumeUsdc: number | null; attributedTrades: number | null; marketsCreated: number | null } | null = null;
  if (pantaConfigured()) {
    try {
      const d = await pantaApi.dashboard();
      panta = {
        attributedVolumeUsdc: usdcFromBase(d.metrics?.trades?.volumeUsdcBase ?? null),
        attributedTrades: toNumber(d.metrics?.trades?.total ?? null),
        marketsCreated: toNumber(d.metrics?.creates?.total ?? null),
      };
    } catch {
      panta = null;
    }
  }

  return json({
    creatorsWithMarkets: Number(creators[0]?.n ?? 0),
    liveMarkets: Number(live[0]?.n ?? 0),
    totalMarkets: Number(total[0]?.n ?? 0),
    buys: Number(buys[0]?.n ?? 0),
    uniqueFundedWallets: Number(wallets[0]?.n ?? 0),
    repeatTraders: Number(repeatRows[0]?.n ?? 0),
    buyVolumeUsdc: Number(volume[0]?.v ?? 0),
    freeCalls: Number(calls[0]?.n ?? 0),
    tradesByChannel: channels.map((c) => ({ channel: c.channel ?? "direct", trades: Number(c.n) })),
    panta,
    generatedAt: Math.floor(Date.now() / 1000),
  });
});
