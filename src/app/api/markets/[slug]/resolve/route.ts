import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { getMarketRowBySlug } from "@/lib/markets";
import { notifyMany } from "@/lib/notifications";
import { isHttpUrl } from "@/lib/lint";

// Only FREE calls are settled by their creator, with a public evidence link.
// Real-money markets are always resolved by Panta; there is no creator
// resolve control for them anywhere in the app.
const Body = z.object({ outcome: z.enum(["yes", "no", "void"]), evidenceUrl: z.string().url() });

export const POST = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser(req);
  const { slug } = await ctx.params;
  const row = await getMarketRowBySlug(slug);
  if (!row) throw new HttpError(404, "NOT_FOUND");
  if (row.kind !== "forecast") throw new HttpError(403, "FORBIDDEN", "Real-money markets are resolved by Panta, not the creator.");
  if (row.creatorId !== user.id) throw new HttpError(403, "FORBIDDEN", "Only the creator can settle a free call.");
  if (row.outcome) throw new HttpError(409, "BAD_REQUEST", "This call is already settled.");
  if (row.endAt.getTime() > Date.now()) throw new HttpError(409, "BAD_REQUEST", "Calls are still open. Settle after they close.");
  const { outcome, evidenceUrl } = Body.parse(await readJson(req));
  if (!isHttpUrl(evidenceUrl)) throw new HttpError(400, "BAD_REQUEST", "Evidence must be a public link.");

  const db = await getDb();
  const [m] = await db
    .update(schema.markets)
    .set({ outcome, status: outcome === "void" ? "void" : "resolved", resolvedAt: new Date(), resolutionNote: evidenceUrl })
    .where(eq(schema.markets.id, row.id))
    .returning();
  const callers = await db.select({ id: schema.forecasts.userId }).from(schema.forecasts).where(eq(schema.forecasts.marketId, row.id));
  await notifyMany(
    callers.map((c) => c.id),
    {
      kind: "resolved",
      dedupeKey: `resolved:${row.id}`,
      title: `Free call settled: ${outcome.toUpperCase()}`,
      body: row.question,
      url: `/m/${row.slug}`,
    },
  );
  return json({ ok: true, outcome: m.outcome });
});
