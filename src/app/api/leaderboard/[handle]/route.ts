import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { creatorLeaderboard, creatorRecord } from "@/lib/leaderboard";
import { LEADERBOARD_MIN_CALLS } from "@/lib/config";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ handle: string }> }) => {
  const { handle } = await ctx.params;
  const db = await getDb();
  const creator = await db.query.users.findFirst({ where: eq(schema.users.handle, handle.toLowerCase()) });
  if (!creator) throw new HttpError(404, "NOT_FOUND");
  const [rows, record] = await Promise.all([creatorLeaderboard(creator.id), creatorRecord(creator.id)]);
  return json({ rows, record, minCalls: LEADERBOARD_MIN_CALLS });
});
