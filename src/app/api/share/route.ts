import { z } from "zod";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { json, readJson, route } from "@/lib/http";
import { getMarketRowBySlug } from "@/lib/markets";
import { SHARE_CHANNELS } from "@/lib/config";
import { VISITOR_COOKIE, parseRef } from "@/lib/attribution";
import { clientIp, limit } from "@/lib/rate-limit";
import { detectBrowser } from "@/lib/ua";

// Funnel events. "share" when someone taps a share button; "visit" once per
// visitor per market per channel when a shared link is opened.
const Body = z.object({
  slug: z.string(),
  event: z.enum(["share", "visit"]),
  channel: z.string().optional(),
  ref: z.string().optional(),
});

export const POST = route(async (req: Request) => {
  limit(`share:${clientIp(req)}`, 60, 60_000);
  const body = Body.parse(await readJson(req));
  const row = await getMarketRowBySlug(body.slug);
  if (!row) return json({ ok: false });
  const user = await getUser(req).catch(() => null);
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
  const db = await getDb();

  if (body.event === "share") {
    const channel = body.channel && body.channel in SHARE_CHANNELS ? body.channel : "native";
    const creator = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, row.creatorId) });
    await db.insert(schema.shareEvents).values({
      marketId: row.id,
      creatorHandle: creator?.handle ?? null,
      channel,
      event: "share",
      userId: user?.id ?? null,
      visitorId,
      browser: detectBrowser(req.headers.get("user-agent")),
    });
    return json({ ok: true });
  }

  const ref = parseRef(body.ref);
  if (!ref || !visitorId) return json({ ok: true });
  await db
    .insert(schema.shareEvents)
    .values({
      marketId: row.id,
      creatorHandle: ref.creator,
      channel: ref.channel,
      event: "visit",
      userId: user?.id ?? null,
      visitorId,
      browser: detectBrowser(req.headers.get("user-agent")),
    })
    .onConflictDoNothing();
  return json({ ok: true });
});
