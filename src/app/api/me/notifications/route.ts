import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { json, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, user.id))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50);
  return json({
    items: rows.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      url: n.url,
      read: Boolean(n.readAt),
      createdAt: Math.floor(n.createdAt.getTime() / 1000),
    })),
  });
});

// Mark everything read.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const db = await getDb();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
  return json({ ok: true });
});
