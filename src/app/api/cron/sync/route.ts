import { and, asc, eq, inArray, isNull, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError, json, route } from "@/lib/http";
import { syncMarket } from "@/lib/markets";
import { notify } from "@/lib/notifications";
import { pantaApi, pantaConfigured } from "@/lib/panta/client";

export const maxDuration = 60;

// Scheduled job (Vercel Cron, every 5 minutes):
// 1. refresh prices/phase/outcome for open Panta markets and record history;
// 2. remind creators to settle free calls that are past their result time;
// 3. watch declared team wallets for trades on the creator's own markets;
// 4. tell creators to check creator fees once a market has resolved.
export const GET = route(async (req: Request) => {
  const secret = env.cronSecret();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) throw new HttpError(401, "UNAUTHORIZED", "Bad cron secret.");
  const db = await getDb();
  const report = { synced: 0, reminders: 0, flagged: 0, feeNotices: 0 };

  // 1. sync
  if (pantaConfigured()) {
    const open = await db
      .select()
      .from(schema.markets)
      .where(and(eq(schema.markets.kind, "panta"), inArray(schema.markets.status, ["live", "closed"])))
      .orderBy(asc(schema.markets.lastSyncedAt))
      .limit(40);
    for (const m of open) {
      const after = await syncMarket(m, true);
      report.synced++;
      if (after.outcome && after.outcome !== "void") {
        await notify(after.creatorId, {
          kind: "creator_fees",
          dedupeKey: `fees:${after.id}`,
          title: "Your market resolved: check creator fees",
          body: after.question,
          url: "/studio",
        });
        report.feeNotices++;
      }
    }
  }

  // 2. free calls waiting on their creator
  const due = await db
    .select()
    .from(schema.markets)
    .where(and(eq(schema.markets.kind, "forecast"), isNull(schema.markets.outcome), lt(schema.markets.resolutionAt, new Date())))
    .limit(100);
  for (const m of due) {
    await notify(m.creatorId, {
      kind: "settle_call",
      dedupeKey: `settle:${m.id}`,
      title: "Settle your free call",
      body: m.question,
      url: `/m/${m.slug}`,
    });
    report.reminders++;
  }

  // 3. restricted-trader monitor
  if (pantaConfigured()) {
    const restricted = await db.select().from(schema.restrictedTraders).limit(20);
    for (const r of restricted) {
      const mine = await db
        .select({ id: schema.markets.id, pantaMarketId: schema.markets.pantaMarketId, slug: schema.markets.slug, flagged: schema.markets.restrictedTradeFlaggedAt })
        .from(schema.markets)
        .where(and(eq(schema.markets.creatorId, r.creatorId), eq(schema.markets.kind, "panta")));
      const byPanta = new Map(mine.filter((m) => m.pantaMarketId).map((m) => [m.pantaMarketId!, m]));
      if (!byPanta.size) continue;
      let trades;
      try {
        trades = (await pantaApi.walletTrades(r.wallet, 100)).items ?? [];
      } catch {
        continue;
      }
      for (const t of trades) {
        const m = byPanta.get(t.marketId);
        if (!m || m.flagged) continue;
        await db.update(schema.markets).set({ restrictedTradeFlaggedAt: new Date() }).where(eq(schema.markets.id, m.id));
        m.flagged = new Date();
        await notify(r.creatorId, {
          kind: "restricted_trade",
          dedupeKey: `restricted:${m.id}:${r.wallet}`,
          title: "A restricted wallet traded your market",
          body: `${r.relation} wallet ${r.wallet.slice(0, 4)}…${r.wallet.slice(-4)} traded. The market now shows a public notice.`,
          url: `/m/${m.slug}`,
        });
        report.flagged++;
      }
    }
  }
  return json(report);
});
