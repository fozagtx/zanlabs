import { asc, eq, gte, and } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { getMarketRowBySlug } from "@/lib/markets";

// Price history recorded by our snapshotter (Panta keeps none).
export const GET = route(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const row = await getMarketRowBySlug(slug);
  if (!row) throw new HttpError(404, "NOT_FOUND");
  const db = await getDb();
  const since = new Date(Date.now() - 14 * 86400_000);
  const points = await db
    .select({ at: schema.marketSnapshots.at, yes: schema.marketSnapshots.yesPrice })
    .from(schema.marketSnapshots)
    .where(and(eq(schema.marketSnapshots.marketId, row.id), gte(schema.marketSnapshots.at, since)))
    .orderBy(asc(schema.marketSnapshots.at))
    .limit(2000);
  return json({
    points: points.filter((p) => p.yes !== null).map((p) => ({ t: Math.floor(p.at.getTime() / 1000), yes: Number(p.yes) })),
  });
});
