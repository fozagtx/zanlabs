import { z } from "zod";
import { assertWallet, requireUser } from "@/lib/auth";
import { requireCreator } from "@/lib/creator";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { isHttpUrl, lintMarket } from "@/lib/lint";
import { countryFromHeaders, realMoneyAllowed } from "@/lib/geo";
import { quoteCreate, tellFollowers } from "@/lib/tx";
import { shortId } from "@/lib/ids";
import { CATEGORIES, MIN_START_DELAY_SEC, START_DELAY_BUFFER_SEC } from "@/lib/config";

// Create a market. Free calls (tier B or chosen) go live immediately.
// Real-money markets get a Panta fee quote; the creator's own wallet then
// signs the Panta-built transaction (that wallet owns the creator fees).
const Body = z.object({
  kind: z.enum(["panta", "forecast"]),
  template: z.string().max(40).optional(),
  question: z.string().trim(),
  resolutionRule: z.string().trim(),
  sources: z.array(z.string().trim()).min(1).max(20),
  category: z.enum(CATEGORIES),
  startTime: z.number().int().optional(),
  endTime: z.number().int(),
  resolutionTime: z.number().int(),
  imageUrl: z.string().max(2048).optional(),
  creatorCall: z.enum(["yes", "no"]).nullable(),
  description: z.string().max(1000).optional(),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { profile, usernames } = await requireCreator(user);
  const body = Body.parse(await readJson(req));
  const now = Math.floor(Date.now() / 1000);
  const startTime =
    body.kind === "panta" ? Math.max(body.startTime ?? 0, now + MIN_START_DELAY_SEC + START_DELAY_BUFFER_SEC) : now;

  const lint = lintMarket({
    question: body.question,
    resolutionRule: body.resolutionRule,
    sources: body.sources,
    category: body.category,
    startTime,
    endTime: body.endTime,
    resolutionTime: body.resolutionTime,
    kind: body.kind,
    creatorUsernames: usernames,
  });
  if (lint.tier === "C") throw new HttpError(400, "LINT_BLOCKED", undefined, { lint });
  if (body.kind === "panta" && lint.tier === "B") throw new HttpError(409, "TIER_FORECAST_ONLY", undefined, { lint });
  if (!lint.ok) throw new HttpError(400, "LINT_BLOCKED", undefined, { lint });

  const db = await getDb();
  const slug = shortId(8);

  if (body.kind === "forecast") {
    const [m] = await db
      .insert(schema.markets)
      .values({
        slug,
        kind: "forecast",
        status: "live",
        creatorId: user.id,
        question: body.question,
        resolutionRule: body.resolutionRule,
        sources: body.sources,
        category: body.category,
        tier: lint.tier === "A" ? "A" : "B",
        template: body.template ?? null,
        creatorCall: body.creatorCall,
        startAt: new Date(startTime * 1000),
        endAt: new Date(body.endTime * 1000),
        resolutionAt: new Date(body.resolutionTime * 1000),
        imageUrl: body.imageUrl && isHttpUrl(body.imageUrl) ? body.imageUrl : null,
      })
      .returning();
    await tellFollowers(m);
    return json({ kind: "forecast", slug: m.slug });
  }

  // Real money: creator region + current request region must both allow it.
  if (!profile.realMoneyEnabled || !realMoneyAllowed(countryFromHeaders(req.headers))) {
    throw new HttpError(403, "REAL_MONEY_OFF");
  }
  if (!body.imageUrl || !isHttpUrl(body.imageUrl)) {
    throw new HttpError(400, "BAD_REQUEST", "Panta needs a public cover image. Generate one or upload your own.");
  }
  await assertWallet(user, profile.createWallet);

  const [m] = await db
    .insert(schema.markets)
    .values({
      slug,
      kind: "panta",
      status: "draft",
      creatorId: user.id,
      question: body.question,
      resolutionRule: body.resolutionRule,
      sources: body.sources,
      category: body.category,
      tier: "A",
      template: body.template ?? null,
      creatorCall: body.creatorCall,
      startAt: new Date(startTime * 1000),
      endAt: new Date(body.endTime * 1000),
      resolutionAt: new Date(body.resolutionTime * 1000),
      imageUrl: body.imageUrl,
    })
    .returning();

  const quote = await quoteCreate(user, m.id, {
    wallet: profile.createWallet,
    question: body.question,
    resolutionRule: body.resolutionRule,
    sourcesOfTruth: body.sources,
    category: body.category,
    startTime,
    endTime: body.endTime,
    resolutionTime: body.resolutionTime,
    imageUrl: body.imageUrl,
    marketType: "standard",
    title: body.question,
    description: body.description ?? `Creator call by @${user.handle}`,
    region: "Global",
  });
  return json({ kind: "panta", slug: m.slug, wallet: profile.createWallet, ...quote });
});
