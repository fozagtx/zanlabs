import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { toViews } from "@/lib/markets";

// A creator's markets (drafts excluded) for their link page and dashboard,
// optionally only settled ones (tab=settled). There is no public feed: fans
// arrive from links the creator shares.
export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab");
  const handle = url.searchParams.get("creator");
  if (!handle) throw new HttpError(400, "BAD_REQUEST", "creator is required.");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 60);
  const db = await getDb();

  const creator = await db.query.users.findFirst({ where: eq(schema.users.handle, handle.toLowerCase()) });
  if (!creator) return json({ items: [] });
  const where = [ne(schema.markets.status, "draft"), eq(schema.markets.creatorId, creator.id)];
  if (tab === "settled") where.push(inArray(schema.markets.status, ["resolved", "void"]));

  const rows = await db
    .select()
    .from(schema.markets)
    .where(and(...where))
    .orderBy(tab === "settled" ? desc(schema.markets.resolvedAt) : desc(schema.markets.createdAt))
    .limit(limit);
  return json({ items: await toViews(rows) });
});
