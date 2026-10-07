import { HttpError, json, route } from "@/lib/http";
import { pantaApi, pantaConfigured } from "@/lib/panta/client";
import { normalizeMarket } from "@/lib/panta/normalize";
import { CATEGORIES } from "@/lib/config";
import type { CatalogMarket } from "@/lib/types";

// Explore: Panta's live catalog (markets discovered through GET /markets/).
// List rows carry no prices (by design, per Panta docs); the detail view does.
export const GET = route(async (req: Request) => {
  if (!pantaConfigured()) throw new HttpError(503, "PANTA_NOT_CONFIGURED");
  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? undefined;
  if (category && !(CATEGORIES as readonly string[]).includes(category)) throw new HttpError(400, "BAD_REQUEST", "Unknown category.");
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const list = await pantaApi.listMarkets({ status: "primary", category, cursor, limit: 24 });
  const items: CatalogMarket[] = (list.items ?? [])
    .map((m) => normalizeMarket(m))
    .filter((m) => m.marketId)
    .map((m) => ({
      marketId: m.marketId,
      title: m.title,
      category: m.category,
      image: m.image,
      phase: m.phase,
      yes: m.yes,
      volumeUsdc: m.volumeUsdc,
      endTime: m.endTime,
    }));
  return json({ items, nextCursor: list.nextCursor ?? null });
});
