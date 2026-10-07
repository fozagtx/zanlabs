import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { getMarketRowBySlug } from "@/lib/markets";
import { pantaApi, pantaConfigured } from "@/lib/panta/client";
import { toNumber, toUnixSeconds } from "@/lib/panta/normalize";
import { amountBucket, shortAddr } from "@/lib/format";

// Live activity ticker. Only confirmed on-chain trades from Panta's trade
// tape; amounts are bucketed so individual stakes stay private.
export const GET = route(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const row = await getMarketRowBySlug(slug);
  if (!row) throw new HttpError(404, "NOT_FOUND");
  if (row.kind !== "panta" || !row.pantaMarketId || !pantaConfigured()) return json({ items: [] });

  let items: Awaited<ReturnType<typeof pantaApi.marketTrades>>["items"] = [];
  try {
    items = (await pantaApi.marketTrades(row.pantaMarketId, 30)).items ?? [];
  } catch {
    return json({ items: [], stale: true });
  }
  const db = await getDb();
  const wallets = [...new Set(items.map((t) => t.wallet))];
  const known = wallets.length
    ? await db
        .select({ address: schema.wallets.address, handle: schema.users.handle, refCode: schema.users.refCode })
        .from(schema.wallets)
        .innerJoin(schema.users, eq(schema.users.id, schema.wallets.userId))
        .where(inArray(schema.wallets.address, wallets))
    : [];
  const names = new Map(known.map((k) => [k.address, k.handle ? `@${k.handle}` : `fan-${k.refCode}`]));

  return json({
    items: items.slice(0, 30).map((t) => {
      const yes = usdcAmount(t.yesAmount);
      const no = usdcAmount(t.noAmount);
      const side = yes > 0 && no === 0 ? "yes" : no > 0 && yes === 0 ? "no" : null;
      const amt = yes + no;
      return {
        signature: t.signature,
        who: names.get(t.wallet) ?? shortAddr(t.wallet),
        side,
        amount: amountBucket(amt > 0 ? amt : null),
        at: toUnixSeconds(t.blockTime),
      };
    }),
  });
});

// Trade-tape amounts are undocumented: some arrive as decimal USDC, some as
// integer base units (6 decimals). Large integers are treated as base units.
function usdcAmount(v: unknown): number {
  const n = toNumber(v) ?? 0;
  return Number.isInteger(n) && n >= 100_000 ? n / 1e6 : n;
}
