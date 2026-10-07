import { z } from "zod";
import { cookies } from "next/headers";
import { assertWallet, requireUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { countryFromHeaders } from "@/lib/geo";
import { assertNotRestricted, assertRegionAndAge, assertWithinLimits } from "@/lib/eligibility";
import { getMarketRowBySlug, syncMarket } from "@/lib/markets";
import { quoteBuy } from "@/lib/tx";
import { REF_COOKIE, formatRef, parseRef } from "@/lib/attribution";
import { limit } from "@/lib/rate-limit";
import { MAX_SINGLE_STAKE } from "@/lib/config";

const Body = z
  .object({
    slug: z.string().optional(),
    pantaMarketId: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).optional(),
    side: z.enum(["yes", "no"]),
    amount: z.number().min(1).max(MAX_SINGLE_STAKE),
    wallet: z.string(),
    ref: z.string().optional(),
  })
  .refine((b) => Boolean(b.slug) !== Boolean(b.pantaMarketId), "Provide slug or pantaMarketId");

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  limit(`quote:${user.id}`, 12, 60_000);
  const body = Body.parse(await readJson(req));
  await assertWallet(user, body.wallet);
  assertRegionAndAge(user, countryFromHeaders(req.headers));

  let market: { id: string | null; pantaMarketId: string | null };
  if (body.slug) {
    let row = await getMarketRowBySlug(body.slug);
    if (!row || row.kind !== "panta" || !row.pantaMarketId) throw new HttpError(404, "MARKET_NOT_FOUND");
    row = await syncMarket(row);
    if (row.status !== "live" || row.endAt.getTime() <= Date.now()) throw new HttpError(409, "MARKET_CLOSED");
    if (row.phase && row.phase !== "primary") throw new HttpError(409, "MARKET_NOT_IN_PRIMARY");
    await assertNotRestricted(user, body.wallet, row.creatorId);
    market = { id: row.id, pantaMarketId: row.pantaMarketId };
  } else {
    market = { id: null, pantaMarketId: body.pantaMarketId! };
  }
  await assertWithinLimits(user.id, body.amount);

  // Attribution: the link the fan is on wins, else the first-touch cookie.
  const ref = parseRef(body.ref) ?? parseRef((await cookies()).get(REF_COOKIE)?.value);
  const quote = await quoteBuy({
    user,
    market,
    wallet: body.wallet,
    side: body.side,
    amount: body.amount,
    refCode: ref ? formatRef(ref) : null,
  });
  return json(quote);
});
