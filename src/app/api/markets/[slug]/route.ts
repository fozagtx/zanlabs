import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { getMarketView } from "@/lib/markets";

export const GET = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const market = await getMarketView(slug);
  if (!market) throw new HttpError(404, "NOT_FOUND", "This market doesn't exist.");

  // Viewer-specific bits: their free call, reactions, and whether they follow the creator.
  const user = await getUser(req).catch(() => null);
  let viewer = null;
  if (user) {
    const db = await getDb();
    const [call, rx, creator] = await Promise.all([
      db.query.forecasts.findFirst({ where: and(eq(schema.forecasts.userId, user.id), eq(schema.forecasts.marketId, market.id)) }),
      db.select({ k: schema.reactions.kind }).from(schema.reactions).where(and(eq(schema.reactions.userId, user.id), eq(schema.reactions.marketId, market.id))),
      db.query.users.findFirst({ where: eq(schema.users.handle, market.creator.handle) }),
    ]);
    const follows = creator
      ? await db.query.follows.findFirst({ where: and(eq(schema.follows.followerId, user.id), eq(schema.follows.creatorId, creator.id)) })
      : null;
    viewer = {
      call: call?.side ?? null,
      reactions: rx.map((r) => r.k),
      following: Boolean(follows),
      isCreator: creator?.id === user.id,
    };
  }
  return json({ market, viewer });
});
