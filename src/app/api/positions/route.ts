import { desc, eq, inArray, isNull, and } from "drizzle-orm";
import { requireUser, userWallets } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { announceResolution } from "@/lib/markets";
import { pantaApi, pantaConfigured } from "@/lib/panta/client";
import { normalizeMarket, toSide, toNumber } from "@/lib/panta/normalize";

// Portfolio: Panta positions for every wallet the user holds, valued from
// live prices (open) or ~1 USDC per winning share (resolved), plus free calls.
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const db = await getDb();
  const wallets = await userWallets(user.id);

  type Row = {
    wallet: string;
    pantaMarketId: string;
    slug: string | null;
    question: string;
    side: "yes" | "no";
    shares: number;
    phase: string | null;
    outcome: "yes" | "no" | null;
    claimable: boolean;
    claimed: boolean;
    price: number | null;
    estValueUsdc: number | null;
  };
  const positions: Row[] = [];
  let pantaError: string | null = null;

  if (pantaConfigured()) {
    for (const wallet of wallets) {
      let rows;
      try {
        rows = (await pantaApi.positions(wallet)).positions ?? [];
      } catch (e) {
        pantaError = (e as { code?: string }).code ?? "INTERNAL_ERROR";
        continue;
      }
      const ids = [...new Set(rows.map((r) => r.marketId))];
      const ours = ids.length ? await db.select().from(schema.markets).where(inArray(schema.markets.pantaMarketId, ids)) : [];
      const ourById = new Map(ours.map((m) => [m.pantaMarketId!, m]));
      for (const r of rows) {
        const side = toSide(r.side);
        if (!side) continue;
        const shares = toNumber(r.shares) ?? 0;
        const outcome = toSide(r.outcome);
        const m = ourById.get(r.marketId);
        let question = m?.question ?? null;
        let price: number | null = null;
        if (!outcome) {
          try {
            const n = normalizeMarket(await pantaApi.getMarket(r.marketId, 15_000));
            question ??= n.title;
            price = side === "yes" ? n.yes : n.no;
          } catch {
            /* value unknown */
          }
        }
        if (m && outcome && !m.outcome) {
          const [updated] = await db
            .update(schema.markets)
            .set({ outcome, status: "resolved", resolvedAt: new Date(), phase: "resolved" })
            .where(and(eq(schema.markets.id, m.id), isNull(schema.markets.outcome)))
            .returning();
          if (updated) {
            m.outcome = outcome;
            await announceResolution(updated);
          }
        }
        positions.push({
          wallet,
          pantaMarketId: r.marketId,
          slug: m?.slug ?? null,
          question: question ?? "Panta market",
          side,
          shares,
          phase: typeof r.phase === "string" ? r.phase : null,
          outcome,
          claimable: Boolean(r.claimable),
          claimed: Boolean(r.claimed),
          price,
          estValueUsdc: outcome ? (outcome === side ? shares : 0) : price !== null ? shares * price : null,
        });
      }
    }
  }

  const calls = await db
    .select({
      side: schema.forecasts.side,
      createdAt: schema.forecasts.createdAt,
      slug: schema.markets.slug,
      question: schema.markets.question,
      outcome: schema.markets.outcome,
      endAt: schema.markets.endAt,
    })
    .from(schema.forecasts)
    .innerJoin(schema.markets, eq(schema.markets.id, schema.forecasts.marketId))
    .where(eq(schema.forecasts.userId, user.id))
    .orderBy(desc(schema.forecasts.createdAt))
    .limit(100);

  const decided = [
    ...positions.filter((p) => p.outcome).map((p) => p.side === p.outcome),
    ...calls.filter((c) => c.outcome === "yes" || c.outcome === "no").map((c) => c.side === c.outcome),
  ];
  return json({
    wallets,
    positions,
    calls: calls.map((c) => ({ ...c, createdAt: Math.floor(c.createdAt.getTime() / 1000), endAt: Math.floor(c.endAt.getTime() / 1000) })),
    record: { decided: decided.length, correct: decided.filter(Boolean).length },
    pantaError,
  });
});
