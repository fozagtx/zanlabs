import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { getMarketRowBySlug } from "@/lib/markets";
import { REF_COOKIE, parseRef, formatRef } from "@/lib/attribution";

// Free calls: no money, no prizes. Used for creator-controlled questions and
// for fans in regions where real money is off. One call per market; it can
// be changed until the market closes.
const Body = z.object({ side: z.enum(["yes", "no"]) });

export const POST = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser(req);
  const { slug } = await ctx.params;
  const row = await getMarketRowBySlug(slug);
  if (!row || row.status === "draft") throw new HttpError(404, "NOT_FOUND");
  if (row.endAt.getTime() <= Date.now() || row.status !== "live") throw new HttpError(409, "MARKET_CLOSED");
  if (row.creatorId === user.id) throw new HttpError(403, "BAD_REQUEST", "Your call is already on the market.");
  const { side } = Body.parse(await readJson(req));
  const ref = parseRef((await cookies()).get(REF_COOKIE)?.value);
  const db = await getDb();
  await db
    .insert(schema.forecasts)
    .values({ userId: user.id, marketId: row.id, side, refCode: ref ? formatRef(ref) : null })
    .onConflictDoUpdate({ target: [schema.forecasts.userId, schema.forecasts.marketId], set: { side, createdAt: new Date() } });
  return json({ ok: true, side });
});
