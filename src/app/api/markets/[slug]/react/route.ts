import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { getMarketRowBySlug } from "@/lib/markets";

const Body = z.object({ kind: z.enum(["fire", "cap", "eyes", "clap"]) });

// Toggle a reaction.
export const POST = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser(req);
  const { slug } = await ctx.params;
  const row = await getMarketRowBySlug(slug);
  if (!row || row.status === "draft") throw new HttpError(404, "NOT_FOUND");
  const { kind } = Body.parse(await readJson(req));
  const db = await getDb();
  const where = and(eq(schema.reactions.marketId, row.id), eq(schema.reactions.userId, user.id), eq(schema.reactions.kind, kind));
  const existing = await db.query.reactions.findFirst({ where });
  if (existing) await db.delete(schema.reactions).where(where);
  else await db.insert(schema.reactions).values({ marketId: row.id, userId: user.id, kind }).onConflictDoNothing();
  return json({ kind, active: !existing });
});
