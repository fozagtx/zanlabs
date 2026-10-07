import "server-only";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { pantaApi, pantaConfigured } from "./panta/client";
import { normalizeMarket, toSide } from "./panta/normalize";
import type { MarketView } from "./types";
import { notifyMany } from "./notifications";

type MarketRow = typeof schema.markets.$inferSelect;
type UserRowLite = Pick<typeof schema.users.$inferSelect, "id" | "handle" | "displayName" | "avatarUrl">;

const SYNC_INTERVAL_MS = 20_000;
const SNAPSHOT_INTERVAL_MS = 60_000;

export function pantaMarketUrl(marketId: string | null): string | null {
  if (!marketId) return null;
  const tpl = process.env.NEXT_PUBLIC_PANTA_MARKET_URL_TEMPLATE;
  return tpl ? tpl.replace("{id}", encodeURIComponent(marketId)) : "https://panta.market";
}

function statusFromPhase(row: MarketRow, phase: string | null): MarketRow["status"] {
  if (phase === "resolved") return "resolved";
  if (phase === "cancelled") return "void";
  if (row.endAt.getTime() <= Date.now()) return "closed";
  return row.status === "draft" ? "draft" : "live";
}

/** Pull fresh state for a Panta market (prices, phase, outcome) and record a snapshot. */
export async function syncMarket(row: MarketRow, force = false): Promise<MarketRow> {
  const db = await getDb();
  if (row.kind === "forecast") {
    if (row.status === "live" && row.endAt.getTime() <= Date.now()) {
      const [u] = await db.update(schema.markets).set({ status: "closed" }).where(eq(schema.markets.id, row.id)).returning();
      return u ?? row;
    }
    return row;
  }
  if (!row.pantaMarketId || !pantaConfigured()) return row;
  if (row.status === "resolved" || row.status === "void") return row;
  if (!force && row.lastSyncedAt && Date.now() - row.lastSyncedAt.getTime() < SYNC_INTERVAL_MS) return row;

  let n;
  try {
    n = normalizeMarket(await pantaApi.getMarket(row.pantaMarketId));
  } catch {
    return row; // keep last known state; the page shows its "as of" time
  }
  let outcome: MarketRow["outcome"] = row.outcome;
  if (n.phase === "resolved" && !outcome) outcome = n.outcome ?? (await learnOutcome(row));
  if (n.phase === "cancelled") outcome = "void";

  const status = n.phase === "resolved" && !outcome ? "closed" : statusFromPhase(row, n.phase);
  const patch: Partial<MarketRow> = {
    phase: n.phase ?? row.phase,
    status,
    yesPrice: n.yes !== null ? n.yes.toFixed(6) : row.yesPrice,
    volumeUsdc: n.volumeUsdc !== null ? n.volumeUsdc.toFixed(6) : row.volumeUsdc,
    lastSyncedAt: new Date(),
  };
  if (outcome && !row.outcome) {
    patch.outcome = outcome;
    patch.resolvedAt = new Date();
  }
  const [updated] = await db.update(schema.markets).set(patch).where(eq(schema.markets.id, row.id)).returning();

  const last = await db.query.marketSnapshots.findFirst({
    where: eq(schema.marketSnapshots.marketId, row.id),
    orderBy: desc(schema.marketSnapshots.at),
  });
  if (n.yes !== null && (!last || Date.now() - last.at.getTime() >= SNAPSHOT_INTERVAL_MS)) {
    await db
      .insert(schema.marketSnapshots)
      .values({ marketId: row.id, yesPrice: n.yes.toFixed(6), volumeUsdc: n.volumeUsdc?.toFixed(6) ?? null })
      .onConflictDoNothing();
  }
  if (patch.outcome && updated) await announceResolution(updated);
  return updated ?? row;
}

/**
 * The documented market card has no outcome field, but position rows do.
 * Ask Panta for positions of wallets that traded this market (or its creator).
 */
async function learnOutcome(row: MarketRow): Promise<MarketRow["outcome"]> {
  if (!row.pantaMarketId) return null;
  const db = await getDb();
  const traded = await db
    .selectDistinct({ wallet: schema.trades.wallet })
    .from(schema.trades)
    .where(eq(schema.trades.pantaMarketId, row.pantaMarketId))
    .limit(3);
  const creator = await db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, row.creatorId) });
  const candidates = [...traded.map((t) => t.wallet), creator?.createWallet].filter(Boolean) as string[];
  for (const w of candidates) {
    try {
      const { positions } = await pantaApi.positions(w);
      const p = positions.find((x) => x.marketId === row.pantaMarketId && x.outcome);
      const side = p ? toSide(p.outcome) : null;
      if (side) return side;
    } catch {
      /* try next wallet */
    }
  }
  return null;
}

export async function announceResolution(row: MarketRow) {
  const db = await getDb();
  const holders = await db
    .selectDistinct({ userId: schema.trades.userId })
    .from(schema.trades)
    .where(and(eq(schema.trades.marketId, row.id), isNotNull(schema.trades.userId)));
  const callers = await db.select({ userId: schema.forecasts.userId }).from(schema.forecasts).where(eq(schema.forecasts.marketId, row.id));
  const ids = new Set<string>([...holders.map((h) => h.userId!), ...callers.map((c) => c.userId), row.creatorId]);
  const outcomeText = row.outcome === "void" ? "was cancelled" : `resolved ${row.outcome?.toUpperCase()}`;
  await notifyMany([...ids], {
    kind: "resolved",
    dedupeKey: `resolved:${row.id}`,
    title: `"${truncate(row.question, 60)}" ${outcomeText}`,
    body: row.kind === "panta" ? "Open your portfolio to claim any winnings." : "See how your call did.",
    url: row.kind === "panta" ? "/portfolio" : `/m/${row.slug}`,
  });
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export async function loadCreators(ids: string[]) {
  if (!ids.length) return new Map<string, MarketView["creator"]>();
  const db = await getDb();
  const users = await db
    .select({ id: schema.users.id, handle: schema.users.handle, displayName: schema.users.displayName, avatarUrl: schema.users.avatarUrl })
    .from(schema.users)
    .where(inArray(schema.users.id, ids));
  const socials = await db
    .select({ userId: schema.socialAccounts.userId, provider: schema.socialAccounts.provider, username: schema.socialAccounts.username })
    .from(schema.socialAccounts)
    .where(inArray(schema.socialAccounts.userId, ids));
  const map = new Map<string, MarketView["creator"]>();
  for (const u of users as UserRowLite[]) {
    map.set(u.id, {
      handle: u.handle ?? "creator",
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      socials: socials.filter((s) => s.userId === u.id).map((s) => ({ provider: s.provider, username: s.username })),
    });
  }
  return map;
}

async function countsFor(ids: string[]) {
  const db = await getDb();
  const empty = { traders: 0, calls: 0, comments: 0, callsYes: 0, callsNo: 0 };
  const out = new Map<string, MarketView["counts"]>();
  const reactions = new Map<string, MarketView["reactions"]>();
  if (!ids.length) return { out, reactions };
  const traders = await db
    .select({ m: schema.trades.marketId, n: sql<number>`count(distinct ${schema.trades.wallet})` })
    .from(schema.trades)
    .where(and(inArray(schema.trades.marketId, ids), eq(schema.trades.kind, "buy")))
    .groupBy(schema.trades.marketId);
  const calls = await db
    .select({ m: schema.forecasts.marketId, side: schema.forecasts.side, n: count() })
    .from(schema.forecasts)
    .where(inArray(schema.forecasts.marketId, ids))
    .groupBy(schema.forecasts.marketId, schema.forecasts.side);
  const comments = await db
    .select({ m: schema.comments.marketId, n: count() })
    .from(schema.comments)
    .where(and(inArray(schema.comments.marketId, ids), sql`${schema.comments.hiddenAt} is null`))
    .groupBy(schema.comments.marketId);
  const rx = await db
    .select({ m: schema.reactions.marketId, k: schema.reactions.kind, n: count() })
    .from(schema.reactions)
    .where(inArray(schema.reactions.marketId, ids))
    .groupBy(schema.reactions.marketId, schema.reactions.kind);
  for (const id of ids) {
    out.set(id, { ...empty });
    reactions.set(id, { fire: 0, cap: 0, eyes: 0, clap: 0 });
  }
  for (const t of traders) if (t.m) out.get(t.m)!.traders = Number(t.n);
  for (const c of calls) {
    const o = out.get(c.m)!;
    o.calls += Number(c.n);
    if (c.side === "yes") o.callsYes += Number(c.n);
    else o.callsNo += Number(c.n);
  }
  for (const c of comments) out.get(c.m)!.comments = Number(c.n);
  for (const r of rx) reactions.get(r.m)![r.k] = Number(r.n);
  return { out, reactions };
}

export async function toViews(rows: MarketRow[]): Promise<MarketView[]> {
  const creators = await loadCreators([...new Set(rows.map((r) => r.creatorId))]);
  const { out, reactions } = await countsFor(rows.map((r) => r.id));
  return rows.map((r) => toView(r, creators.get(r.creatorId)!, out.get(r.id)!, reactions.get(r.id)!));
}

function toView(r: MarketRow, creator: MarketView["creator"], counts: MarketView["counts"], reactions: MarketView["reactions"]): MarketView {
  const sec = (d: Date | null) => (d ? Math.floor(d.getTime() / 1000) : null);
  const open = r.status === "live" && r.endAt.getTime() > Date.now();
  return {
    id: r.id,
    slug: r.slug,
    kind: r.kind,
    status: r.status,
    phase: r.phase,
    question: r.question,
    resolutionRule: r.resolutionRule,
    sources: r.sources,
    category: r.category,
    tier: r.tier,
    creatorCall: r.creatorCall,
    startAt: sec(r.startAt)!,
    endAt: sec(r.endAt)!,
    resolutionAt: sec(r.resolutionAt)!,
    imageUrl: r.imageUrl,
    outcome: r.outcome,
    resolutionNote: r.resolutionNote,
    yes: r.yesPrice !== null ? Number(r.yesPrice) : null,
    volumeUsdc: r.volumeUsdc !== null ? Number(r.volumeUsdc) : null,
    pantaMarketId: r.pantaMarketId,
    pantaUrl: pantaMarketUrl(r.pantaMarketId),
    buyable: r.kind === "panta" && open && (r.phase === "primary" || r.phase === null) && Boolean(r.pantaMarketId),
    restrictedFlag: Boolean(r.restrictedTradeFlaggedAt),
    lastSyncedAt: sec(r.lastSyncedAt),
    creator: creator ?? { handle: "creator", displayName: null, avatarUrl: null, socials: [] },
    counts,
    reactions,
  };
}

export async function getMarketRowBySlug(slug: string): Promise<MarketRow | null> {
  const db = await getDb();
  return (await db.query.markets.findFirst({ where: eq(schema.markets.slug, slug) })) ?? null;
}

export async function getMarketRowByPantaId(pantaMarketId: string): Promise<MarketRow | null> {
  const db = await getDb();
  return (await db.query.markets.findFirst({ where: eq(schema.markets.pantaMarketId, pantaMarketId) })) ?? null;
}

export async function getMarketView(slug: string, sync = true): Promise<MarketView | null> {
  let row = await getMarketRowBySlug(slug);
  if (!row || row.status === "draft") return null;
  if (sync) row = await syncMarket(row);
  const [view] = await toViews([row]);
  return view;
}

export function appUrl(): string {
  return env.appUrl().replace(/\/$/, "");
}
