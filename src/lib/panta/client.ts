import "server-only";
import { env } from "../env";
import { acquire, familyFor } from "./limiter";
import type {
  AccountDashboard,
  ClaimBuild,
  CreateBuild,
  CreateQuote,
  CreateQuoteRequest,
  CreatorFeeBuild,
  ImageUpload,
  MarketItem,
  MarketList,
  MarketTrade,
  OrderBuild,
  OrderQuote,
  OrderStatus,
  PantaErrorBody,
  PositionRow,
  RegisterResult,
  Side,
  TradeReport,
} from "./types";

// Server-only gateway to the Panta API. The API key never leaves the server
// (Panta Terms §3). Every path must end with "/" — Panta rejects others.

export class PantaError extends Error {
  code: string;
  status: number;
  field?: string;
  fields?: Record<string, string[]>;
  constructor(status: number, body: Partial<PantaErrorBody> | null, fallback: string) {
    super(body?.message || fallback);
    this.code = body?.code || fallback;
    this.status = status;
    this.field = body?.field;
    this.fields = body?.fields;
  }
}

type CallOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  userId?: string; // attribution id → X-User-Id
  cacheMs?: number; // GET only
  timeoutMs?: number;
};

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MAX = 500;

export function pantaConfigured(): boolean {
  return Boolean(env.pantaKey());
}

export async function panta<T>(path: string, opts: CallOptions = {}, attempt = 0): Promise<T> {
  const key = env.pantaKey();
  if (!key) throw new PantaError(503, { code: "PANTA_NOT_CONFIGURED" }, "PANTA_NOT_CONFIGURED");
  const [pathname] = path.split("?");
  if (!pathname.endsWith("/")) throw new Error(`Panta paths need a trailing slash: ${path}`);

  const method = opts.method ?? "GET";
  const cacheKey = method === "GET" && opts.cacheMs ? path : null;
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < opts.cacheMs!) return hit.value as T;
  }

  const family = familyFor(method, pathname);
  if (!(await acquire(family))) throw new PantaError(429, { code: "RATE_LIMITED" }, "RATE_LIMITED");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await fetch(env.pantaUrl() + path, {
      method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "X-Api-Key": key,
        "Content-Type": "application/json",
        "X-Request-Id": crypto.randomUUID(),
        ...(opts.userId ? { "X-User-Id": opts.userId } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch (e) {
    throw new PantaError(503, { code: "INTERNAL_ERROR", message: (e as Error).message }, "INTERNAL_ERROR");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429 && attempt < 2) {
    const retry = Number(res.headers.get("Retry-After") ?? "2");
    await new Promise((r) => setTimeout(r, Math.min(5, Number.isFinite(retry) ? retry : 2) * 1000));
    return panta<T>(path, opts, attempt + 1);
  }

  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    throw new PantaError(res.status, json as PantaErrorBody | null, res.status === 429 ? "RATE_LIMITED" : `HTTP_${res.status}`);
  }
  if (cacheKey) {
    if (cache.size > CACHE_MAX) cache.clear();
    cache.set(cacheKey, { at: Date.now(), value: json });
  }
  return json as T;
}

export function invalidate(pathPrefix: string) {
  for (const k of cache.keys()) if (k.startsWith(pathPrefix)) cache.delete(k);
}

// --- typed wrappers --------------------------------------------------------

export const pantaApi = {
  listMarkets(params: { category?: string; status?: string; cursor?: string; limit?: number; createdBy?: "me" }) {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.status) q.set("status", params.status);
    if (params.cursor) q.set("cursor", params.cursor);
    if (params.createdBy) q.set("createdBy", params.createdBy);
    q.set("limit", String(Math.min(params.limit ?? 20, 50)));
    return panta<MarketList>(`/markets/?${q.toString()}`, { cacheMs: 30_000 });
  },
  getMarket(marketId: string, cacheMs = 8_000) {
    return panta<MarketItem>(`/markets/${encodeURIComponent(marketId)}/`, { cacheMs });
  },
  marketTrades(marketId: string, limit = 50) {
    return panta<{ marketId: string; items: MarketTrade[] }>(
      `/markets/${encodeURIComponent(marketId)}/trades/?limit=${limit}`,
      { cacheMs: 10_000 },
    );
  },
  walletTrades(wallet: string, limit = 100) {
    return panta<{ wallet: string; items: MarketTrade[] }>(
      `/wallets/${encodeURIComponent(wallet)}/trades/?limit=${limit}`,
      { cacheMs: 30_000 },
    );
  },
  categories() {
    return panta<{ categories: string[] }>("/categories/", { cacheMs: 3_600_000 });
  },

  imageUpload() {
    return panta<ImageUpload>("/markets/create/image-upload/", { method: "POST", body: {} });
  },
  createQuote(body: CreateQuoteRequest) {
    return panta<CreateQuote>("/markets/create/quote/", { method: "POST", body });
  },
  createBuild(createId: string, wallet: string) {
    return panta<CreateBuild>("/markets/create/build/", { method: "POST", body: { createId, wallet } });
  },
  register(createId: string, signature: string) {
    return panta<RegisterResult>("/markets/register/", { method: "POST", body: { createId, signature } });
  },

  orderQuote(body: { wallet: string; marketId: string; side: Side; amountUsdc: string; userId?: string }) {
    return panta<OrderQuote>("/primaryorderquote/", { method: "POST", body, userId: body.userId });
  },
  orderBuild(body: { quoteId: string; wallet: string; userId?: string; maxSlippageBps?: number }) {
    return panta<OrderBuild>("/primaryorderbuild/", { method: "POST", body, userId: body.userId });
  },
  orderSubmit(body: { orderId: string; signature: string; wallet?: string }) {
    return panta<OrderStatus>("/primaryordersubmit/", { method: "POST", body });
  },
  orderVerify(body: { orderId: string; signature?: string; wallet?: string }) {
    return panta<OrderStatus>("/primaryorderverify/", { method: "POST", body });
  },

  positions(wallet: string) {
    return panta<{ wallet: string; positions: PositionRow[] }>(`/positions/?wallet=${encodeURIComponent(wallet)}`);
  },
  claimBuild(wallet: string, marketId: string) {
    return panta<ClaimBuild>("/claim/build/", { method: "POST", body: { wallet, marketId } });
  },
  creatorFeesBuild(wallet: string, marketId: string) {
    return panta<CreatorFeeBuild>("/claim/creator-fees/build/", { method: "POST", body: { wallet, marketId } });
  },

  reportTrade(body: {
    signature: string;
    wallet: string;
    marketId: string;
    quoteId?: string;
    clientOrderId?: string;
    userId?: string;
  }) {
    return panta<TradeReport>("/trades/", { method: "POST", body, userId: body.userId });
  },
  tradeStatus(signature: string) {
    return panta<TradeReport>(`/trades/${encodeURIComponent(signature)}/`);
  },
  dashboard() {
    return panta<AccountDashboard>("/account/dashboard/", { cacheMs: 60_000 });
  },
};
