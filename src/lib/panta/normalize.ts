import type { MarketItem, PantaPhase, Side } from "./types";

// Defensive normalization for Panta responses. Builders have observed prices in
// two formats (decimal "0.43" vs 1e9-scaled strings), timestamps as unix
// seconds or ISO strings, and cards that intermittently lose their title.

export function toPrice(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n <= 1) return n;
  if (n <= 1e9) return n / 1e9; // 1e9-scaled
  return null;
}

export function toUnixSeconds(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v);
  const asNum = Number(v);
  if (Number.isFinite(asNum)) return asNum > 1e12 ? Math.floor(asNum / 1000) : Math.floor(asNum);
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const PHASES: PantaPhase[] = ["primary", "secondary", "resolved", "cancelled"];

export function toPhase(m: Pick<MarketItem, "phase" | "resolved" | "status">): PantaPhase | null {
  const p = String(m.phase ?? "").toLowerCase();
  if ((PHASES as string[]).includes(p)) return p as PantaPhase;
  if (m.resolved) return "resolved";
  const s = String(m.status ?? "").toLowerCase();
  if ((PHASES as string[]).includes(s)) return s as PantaPhase;
  return null;
}

export function toSide(v: unknown): Side | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "yes" || s === "y" || s === "true") return "yes";
  if (s === "no" || s === "n" || s === "false") return "no";
  return null;
}

export type NormalizedMarket = {
  marketId: string;
  title: string | null;
  description: string | null;
  category: string | null;
  image: string | null;
  phase: PantaPhase | null;
  yes: number | null; // probability 0..1
  no: number | null;
  volumeUsdc: number | null;
  startTime: number | null;
  endTime: number | null;
  resolutionTime: number | null;
  outcome: Side | null;
  creatorAddress: string | null;
  isGraduated: boolean | null;
  tradingFeeAccrued: number | null;
};

export function normalizeMarket(m: MarketItem): NormalizedMarket {
  const yesRaw = toPrice(m.yesPrice) ?? toPrice(m.primaryYesPrice) ?? toPrice(m.secondaryYesPrice);
  const noRaw = toPrice(m.noPrice) ?? toPrice(m.primaryNoPrice) ?? toPrice(m.secondaryNoPrice);
  const yes = yesRaw ?? (noRaw !== null ? Math.max(0, 1 - noRaw) : null);
  const no = noRaw ?? (yesRaw !== null ? Math.max(0, 1 - yesRaw) : null);
  const title = firstText(m.title, m.question, m.description);
  const phase = toPhase(m);
  return {
    marketId: m.marketId,
    title,
    description: firstText(m.description),
    category: m.category ?? null,
    image: Array.isArray(m.images) && m.images.length ? String(m.images[0]) : null,
    phase,
    yes,
    no,
    volumeUsdc: toNumber(m.totalVolumeUsdc) ?? toNumber(m.volumeUsdc),
    startTime: toUnixSeconds(m.startTime),
    endTime: toUnixSeconds(m.endTime),
    resolutionTime: toUnixSeconds(m.resolutionTime),
    outcome: phase === "resolved" ? toSide(m.outcome ?? m.result ?? m.winningOutcome) : null,
    creatorAddress: typeof m.creatorAddress === "string" ? m.creatorAddress : null,
    isGraduated: typeof m.isGraduated === "boolean" ? m.isGraduated : null,
    tradingFeeAccrued: toNumber(m.tradingFeeAccrued),
  };
}

function firstText(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function usdcFromBase(base: string | number | null | undefined): number | null {
  const n = toNumber(base);
  return n === null ? null : n / 1e6;
}

/** Format a decimal USDC amount the way Panta expects ("5.00"). */
export function toAmountString(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}
