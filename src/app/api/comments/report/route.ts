import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { json, readJson, route } from "@/lib/http";

// Community moderation: a comment is hidden once 3 different people report it,
// or immediately when the market's creator reports it.
const Body = z.object({ commentId: z.string().uuid() });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { commentId } = Body.parse(await readJson(req));
  const db = await getDb();
  await db.insert(schema.commentReports).values({ commentId, userId: user.id }).onConflictDoNothing();
  const comment = await db.query.comments.findFirst({ where: eq(schema.comments.id, commentId) });
  if (!comment) return json({ hidden: false });
  const market = await db.query.markets.findFirst({ where: eq(schema.markets.id, comment.marketId) });
  const [{ n }] = await db.select({ n: count() }).from(schema.commentReports).where(eq(schema.commentReports.commentId, commentId));
  const hide = Number(n) >= 3 || market?.creatorId === user.id;
  if (hide) await db.update(schema.comments).set({ hiddenAt: new Date() }).where(eq(schema.comments.id, commentId));
  return json({ hidden: hide });
});
