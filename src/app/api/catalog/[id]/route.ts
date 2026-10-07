import { HttpError, json, route } from "@/lib/http";
import { pantaApi, pantaConfigured } from "@/lib/panta/client";
import { normalizeMarket } from "@/lib/panta/normalize";
import { accountExists } from "@/lib/solana/server";
import { pantaMarketUrl } from "@/lib/markets";

// A single Panta catalog market with live prices. Markets whose event account
// doesn't exist on Solana ("ghost" catalog entries) are reported as such.
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!pantaConfigured()) throw new HttpError(503, "PANTA_NOT_CONFIGURED");
  const { id } = await ctx.params;
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id)) throw new HttpError(400, "BAD_REQUEST", "Not a market id.");
  let raw = await pantaApi.getMarket(id);
  let m = normalizeMarket(raw);
  if (!m.title) {
    // Detail cards intermittently arrive without a title; one uncached retry.
    raw = await pantaApi.getMarket(id, 0);
    m = normalizeMarket(raw);
  }
  const onChain = await accountExists(id);
  const open = m.endTime ? m.endTime * 1000 > Date.now() : true;
  return json({
    market: {
      ...m,
      onChain,
      buyable: onChain && open && m.phase === "primary",
      pantaUrl: pantaMarketUrl(id),
      resolutionRule: typeof raw.resolutionRule === "string" ? raw.resolutionRule : null,
      sources: Array.isArray(raw.sources) ? raw.sources : [],
    },
  });
});
