import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMarketView } from "@/lib/markets";
import { parseRef, formatRef } from "@/lib/attribution";
import { MarketView } from "@/components/market-view";
import { pct } from "@/lib/format";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ r?: string }> };

// The page fans land on from a story, status or post. Server-rendered with
// no login, so it works inside Instagram/TikTok/X in-app browsers and
// produces a rich link preview (WhatsApp, X, iMessage).
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { r } = await searchParams;
  const m = await getMarketView(slug, false);
  if (!m) return { title: "Market not found" };
  const ref = parseRef(r);
  // Version the image by odds bucket so cached previews refresh as odds move.
  const bucket = m.yes === null ? "n" : Math.round(m.yes * 20);
  const img = `/api/card/${m.slug}?f=og&v=${bucket}${ref ? `&r=${formatRef(ref)}` : ""}`;
  const desc =
    m.kind === "panta"
      ? `${m.yes === null ? "New market" : `${pct(m.yes)} chance YES`} · ${m.counts.traders} traders · @${m.creator.handle} earns fees from this market`
      : `Free call by @${m.creator.handle} · ${m.counts.calls} calls`;
  return {
    title: m.question,
    description: desc,
    openGraph: { title: m.question, description: desc, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: m.question, description: desc, images: [img] },
  };
}

export default async function MarketPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { r } = await searchParams;
  const m = await getMarketView(slug);
  if (!m) notFound();
  const ref = parseRef(r);
  return <MarketView initial={m} refCode={ref ? formatRef(ref) : null} />;
}
