import "server-only";
import { getDb, schema } from "./db";

export type NotificationInput = {
  kind: string;
  dedupeKey: string;
  title: string;
  body?: string;
  url?: string;
};

/** In-app notifications. The dedupe key makes cron re-runs safe. */
export async function notify(userId: string, n: NotificationInput) {
  const db = await getDb();
  await db
    .insert(schema.notifications)
    .values({ userId, kind: n.kind, dedupeKey: n.dedupeKey, title: n.title, body: n.body, url: n.url })
    .onConflictDoNothing();
}

export async function notifyMany(userIds: string[], n: NotificationInput) {
  if (!userIds.length) return;
  const db = await getDb();
  await db
    .insert(schema.notifications)
    .values(userIds.map((userId) => ({ userId, kind: n.kind, dedupeKey: n.dedupeKey, title: n.title, body: n.body, url: n.url })))
    .onConflictDoNothing();
}
