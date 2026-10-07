import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";

const Body = z.object({ handle: z.string() });

// Toggle following a creator.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { handle } = Body.parse(await readJson(req));
  const db = await getDb();
  const creator = await db.query.users.findFirst({ where: eq(schema.users.handle, handle.toLowerCase()) });
  if (!creator || creator.role !== "creator") throw new HttpError(404, "NOT_FOUND");
  if (creator.id === user.id) throw new HttpError(400, "BAD_REQUEST", "You can't follow yourself.");
  const where = and(eq(schema.follows.followerId, user.id), eq(schema.follows.creatorId, creator.id));
  const existing = await db.query.follows.findFirst({ where });
  if (existing) await db.delete(schema.follows).where(where);
  else await db.insert(schema.follows).values({ followerId: user.id, creatorId: creator.id }).onConflictDoNothing();
  return json({ following: !existing });
});
