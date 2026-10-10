import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { getMarketView } from "@/lib/markets";
import type { MarketViewer } from "@/lib/types";

export const GET = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const market = await getMarketView(slug);
  if (!market) throw new HttpError(404, "NOT_FOUND", "This market doesn't exist.");

  // Viewer-specific bits: their free call, and whether they made this market.
  const user = await getUser(req).catch(() => null);
  let viewer: MarketViewer | null = null;
  if (user) {
    const db = await getDb();
    const call = await db.query.forecasts.findFirst({ where: and(eq(schema.forecasts.userId, user.id), eq(schema.forecasts.marketId, market.id)) });
    viewer = { call: call?.side ?? null, isCreator: Boolean(user.handle) && user.handle === market.creator.handle };
  }
  return json({ market, viewer });
});
