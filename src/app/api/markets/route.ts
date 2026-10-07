import { and, asc, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { toViews } from "@/lib/markets";

// Feed of creator markets. tab=for-you (newest live first), following,
// closing (soonest close), settled. Optional creator=<handle>.
export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "for-you";
  const handle = url.searchParams.get("creator");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 60);
  const db = await getDb();

  const where = [ne(schema.markets.status, "draft")];
  if (handle) {
    const creator = await db.query.users.findFirst({ where: eq(schema.users.handle, handle.toLowerCase()) });
    if (!creator) return json({ items: [] });
    where.push(eq(schema.markets.creatorId, creator.id));
  }
  if (tab === "following") {
    const user = await getUser(req).catch(() => null);
    if (!user) return json({ items: [], needsAuth: true });
    const f = await db.select({ id: schema.follows.creatorId }).from(schema.follows).where(eq(schema.follows.followerId, user.id));
    if (!f.length) return json({ items: [] });
    where.push(inArray(schema.markets.creatorId, f.map((x) => x.id)));
  }
  if (tab === "settled") {
    where.push(inArray(schema.markets.status, ["resolved", "void"]));
  } else if (!handle) {
    where.push(eq(schema.markets.status, "live"), gt(schema.markets.endAt, new Date()));
  }

  const order =
    tab === "closing" ? [asc(schema.markets.endAt)] : tab === "settled" ? [desc(schema.markets.resolvedAt)] : [desc(schema.markets.createdAt)];
  const rows = await db
    .select()
    .from(schema.markets)
    .where(and(...where))
    .orderBy(...order)
    .limit(limit);
  return json({ items: await toViews(rows) });
});
