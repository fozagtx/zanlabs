import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError, json, route } from "@/lib/http";
import { syncMarket } from "@/lib/markets";
import { pantaApi, pantaConfigured } from "@/lib/panta/client";
import { sweepSentIntents } from "@/lib/tx";

export const maxDuration = 60;

// Scheduled job (Vercel Cron, every 5 minutes):
// 0. finish or expire transactions stuck in "sent";
// 1. refresh prices/phase/outcome for open Panta markets and record history;
// 2. watch declared team wallets for trades on the creator's own markets and
//    flag the market with a public notice.
export const GET = route(async (req: Request) => {
  const secret = env.cronSecret();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) throw new HttpError(401, "UNAUTHORIZED", "Bad cron secret.");
  const db = await getDb();
  const report = { synced: 0, flagged: 0, intents: { finished: 0, expired: 0, gaveUp: 0 } };

  // 0. finish or expire transactions left in "sent" (closed tabs, register hiccups)
  report.intents = await sweepSentIntents();

  // 1. sync
  if (pantaConfigured()) {
    const open = await db
      .select()
      .from(schema.markets)
      .where(and(eq(schema.markets.kind, "panta"), inArray(schema.markets.status, ["live", "closed"])))
      .orderBy(asc(schema.markets.lastSyncedAt))
      .limit(40);
    for (const m of open) {
      await syncMarket(m, true);
      report.synced++;
    }
  }

  // 2. restricted-trader monitor
  if (pantaConfigured()) {
    const restricted = await db.select().from(schema.restrictedTraders).limit(20);
    for (const r of restricted) {
      const mine = await db
        .select({ id: schema.markets.id, pantaMarketId: schema.markets.pantaMarketId, flagged: schema.markets.restrictedTradeFlaggedAt })
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
        report.flagged++;
      }
    }
  }
  return json(report);
});
