import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { publicName, requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { getMarketRowBySlug } from "@/lib/markets";
import { limit } from "@/lib/rate-limit";

// Comments carry a badge derived from the commenter's real activity in the
// market: YES/NO holder (confirmed buys), "called YES/NO" (free call), or creator.

export const GET = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const row = await getMarketRowBySlug(slug);
  if (!row) throw new HttpError(404, "NOT_FOUND");
  const filter = new URL(req.url).searchParams.get("filter"); // all | yes | no | creator
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.comments.id,
      body: schema.comments.body,
      badge: schema.comments.badge,
      createdAt: schema.comments.createdAt,
      handle: schema.users.handle,
      displayName: schema.users.displayName,
      refCode: schema.users.refCode,
      avatarUrl: schema.users.avatarUrl,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(and(eq(schema.comments.marketId, row.id), isNull(schema.comments.hiddenAt)))
    .orderBy(desc(schema.comments.createdAt))
    .limit(100);
  const items = rows
    .filter((c) => {
      if (filter === "yes") return c.badge === "yes_holder" || c.badge === "called_yes";
      if (filter === "no") return c.badge === "no_holder" || c.badge === "called_no";
      if (filter === "creator") return c.badge === "creator";
      return true;
    })
    .map((c) => ({
      id: c.id,
      body: c.body,
      badge: c.badge,
      author: publicName(c),
      avatarUrl: c.avatarUrl,
      createdAt: Math.floor(c.createdAt.getTime() / 1000),
    }));
  return json({ items });
});

const Body = z.object({ body: z.string().trim().min(1).max(500) });

export const POST = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser(req);
  limit(`comment:${user.id}`, 6, 60_000);
  const { slug } = await ctx.params;
  const row = await getMarketRowBySlug(slug);
  if (!row || row.status === "draft") throw new HttpError(404, "NOT_FOUND");
  const { body } = Body.parse(await readJson(req));
  if (/https?:\/\//i.test(body)) throw new HttpError(400, "BAD_REQUEST", "Links aren't allowed in comments.");

  const db = await getDb();
  let badge: string | null = null;
  if (row.creatorId === user.id) badge = "creator";
  else {
    const buys = await db
      .select({ side: schema.trades.side })
      .from(schema.trades)
      .where(and(eq(schema.trades.marketId, row.id), eq(schema.trades.userId, user.id), eq(schema.trades.kind, "buy")));
    const sides = new Set(buys.map((b) => b.side));
    if (sides.size === 2) badge = "both_holder";
    else if (sides.has("yes")) badge = "yes_holder";
    else if (sides.has("no")) badge = "no_holder";
    else {
      const call = await db.query.forecasts.findFirst({
        where: and(eq(schema.forecasts.marketId, row.id), eq(schema.forecasts.userId, user.id)),
      });
      if (call) badge = call.side === "yes" ? "called_yes" : "called_no";
    }
  }
  const [c] = await db.insert(schema.comments).values({ marketId: row.id, userId: user.id, body, badge }).returning();
  return json({
    id: c.id,
    body: c.body,
    badge: c.badge,
    author: publicName(user),
    avatarUrl: user.avatarUrl,
    createdAt: Math.floor(c.createdAt.getTime() / 1000),
  });
});
