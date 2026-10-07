import { HttpError, errorResponse } from "@/lib/http";
import { appUrl, getMarketView } from "@/lib/markets";
import { renderCard, type CardFormat } from "@/lib/cards";
import { parseRef, shareUrl } from "@/lib/attribution";

// GET /api/card/:slug?f=story|og|square&r=<ref>&side=yes|no
// Share images with live odds, QR code and short link baked in.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const url = new URL(req.url);
    const f = (url.searchParams.get("f") ?? "story") as CardFormat;
    if (!["story", "og", "square"].includes(f)) throw new HttpError(400, "BAD_REQUEST", "Unknown format.");
    const m = await getMarketView(slug, false);
    if (!m) throw new HttpError(404, "NOT_FOUND");
    const ref = parseRef(url.searchParams.get("r")) ?? { creator: m.creator.handle, channel: "qr" as const };
    const sideParam = url.searchParams.get("side");
    const pickSide = sideParam === "yes" || sideParam === "no" ? sideParam : undefined;
    const base = appUrl();
    const link = shareUrl(base, m.slug, ref);
    const short = `${new URL(base).host}/m/${m.slug}`;
    return await renderCard(f, {
      question: m.question,
      creatorHandle: m.creator.handle,
      creatorName: m.creator.displayName,
      avatarUrl: m.creator.avatarUrl,
      kind: m.kind,
      yes: m.yes,
      callsYes: m.counts.callsYes,
      callsNo: m.counts.callsNo,
      creatorCall: m.creatorCall,
      closesAt: m.endAt,
      outcome: m.outcome,
      url: link,
      shortUrl: short,
      asOf: m.lastSyncedAt ?? Math.floor(Date.now() / 1000),
      pickSide,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

