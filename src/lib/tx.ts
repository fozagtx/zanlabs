import "server-only";
import { and, asc, eq, lt } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
import { PantaError, invalidate, pantaApi } from "./panta/client";
import { toAmountString } from "./panta/normalize";
import type { CreateQuoteRequest, Side } from "./panta/types";
import { parseRef, pantaUserId } from "./attribution";
import {
  blockhashExpired,
  broadcast,
  buildUsdcTransfer,
  compileForWallet,
  inspectPrebuilt,
  prepareSigned,
  signatureState,
  waitForConfirmation,
} from "./solana/server";
import { withinLimitsLocked } from "./eligibility";
import type { UserRow } from "./auth";
import type { BuiltTx, SubmitResult } from "./types";
import { DEFAULT_SLIPPAGE_BPS, MIN_START_DELAY_SEC, SOLSCAN_TX, START_DELAY_BUFFER_SEC } from "./config";

// Transaction intents: every money-moving action is a row that walks
// quoted → built → sent → confirmed. The server prepares unsigned bytes,
// the user's wallet signs, the server broadcasts and finishes the Panta
// bookkeeping (submit/verify, register, attribution). All steps are
// idempotent so a dropped connection can resume with /api/tx/status.

type Intent = typeof schema.txIntents.$inferSelect;

async function updateIntent(id: string, patch: Partial<Intent>): Promise<Intent> {
  const db = await getDb();
  const [row] = await db
    .update(schema.txIntents)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.txIntents.id, id))
    .returning();
  return row;
}

async function loadIntent(userId: string, intentId: string): Promise<Intent> {
  const db = await getDb();
  const row = await db.query.txIntents.findFirst({
    where: and(eq(schema.txIntents.id, intentId), eq(schema.txIntents.userId, userId)),
  });
  if (!row) throw new HttpError(404, "NOT_FOUND", "That transaction session wasn't found.");
  return row;
}

// --- buy ---------------------------------------------------------------------

export async function quoteBuy(params: {
  user: UserRow;
  market: { id: string | null; pantaMarketId: string | null };
  wallet: string;
  side: Side;
  amount: number;
  refCode: string | null;
}) {
  const { user, market, wallet, side, amount } = params;
  if (!market.pantaMarketId) throw new HttpError(400, "MARKET_NOT_FOUND");
  const ref = parseRef(params.refCode);
  const userId = pantaUserId(ref);
  const q = await pantaApi.orderQuote({
    wallet,
    marketId: market.pantaMarketId,
    side,
    amountUsdc: toAmountString(amount),
    userId,
  });
  // Record the quote under the per-user spend lock so parallel quotes can't
  // each see an empty day and together exceed the daily limit.
  const intent = await withinLimitsLocked(user.id, amount, async (tx) => {
    const [row] = await tx
    .insert(schema.txIntents)
    .values({
      userId: user.id,
      wallet,
      kind: "buy",
      marketId: market.id,
      pantaMarketId: market.pantaMarketId,
      side,
      amountUsdc: toAmountString(amount),
      expectedShares: q.shares,
      refCode: params.refCode,
      pantaQuoteId: q.quoteId,
      details: { quote: q, pantaUserId: userId },
      status: "quoted",
    })
    .returning();
    return row;
  });
  return {
    intentId: intent.id,
    side,
    amountUsdc: Number(q.amountUsdc ?? amount),
    shares: Number(q.shares),
    avgPrice: q.avgPrice ? Number(q.avgPrice) : null,
    feeUsdc: q.feeUsdc ? Number(q.feeUsdc) : null,
    expiresAt: q.expiresAt ?? null,
  };
}

export async function buildBuy(user: UserRow, intentId: string): Promise<BuiltTx> {
  const intent = await loadIntent(user.id, intentId);
  if (intent.kind !== "buy" || intent.status !== "quoted") throw new HttpError(409, "BAD_REQUEST", "This pick was already prepared.");
  // Re-check under the lock (this quote is already counted): catches a break
  // or self-exclusion started after quoting, and concurrent builds.
  await withinLimitsLocked(user.id, 0, async () => undefined);
  const userId = (intent.details?.pantaUserId as string | undefined) ?? undefined;
  let b;
  try {
    b = await pantaApi.orderBuild({
      quoteId: intent.pantaQuoteId!,
      wallet: intent.wallet,
      userId,
      maxSlippageBps: DEFAULT_SLIPPAGE_BPS,
    });
  } catch (e) {
    if (e instanceof PantaError) await updateIntent(intent.id, { status: "expired", errorCode: e.code });
    throw e;
  }
  if (!b.instructions?.length && env.pantaSandbox()) {
    await updateIntent(intent.id, { status: "expired", errorCode: "SANDBOX_NO_TX", pantaOrderId: b.orderId });
    throw new HttpError(422, "SANDBOX_NO_TX");
  }
  const compiled = compileForWallet(b.instructions, intent.wallet, b.recentBlockhash);
  await updateIntent(intent.id, {
    status: "built",
    pantaOrderId: b.orderId,
    messageB64: compiled.messageB64,
    blockhash: b.recentBlockhash,
    lastValidBlockHeight: b.lastValidBlockHeight ?? null,
    expectedShares: b.expectedShares ?? intent.expectedShares,
  });
  return { intentId: intent.id, transaction: compiled.transactionB64, expiresAt: b.expiresAt ?? null };
}

// --- claims ------------------------------------------------------------------

export async function buildClaim(user: UserRow, wallet: string, pantaMarketId: string, kind: "claim" | "creator_fee"): Promise<BuiltTx & { amountUsdc: number | null }> {
  const db = await getDb();
  const market = await db.query.markets.findFirst({ where: eq(schema.markets.pantaMarketId, pantaMarketId) });
  const built =
    kind === "claim" ? await pantaApi.claimBuild(wallet, pantaMarketId) : await pantaApi.creatorFeesBuild(wallet, pantaMarketId);
  const compiled = compileForWallet(built.instructions, wallet, built.recentBlockhash);
  const amount =
    kind === "claim"
      ? Number((built as { winningShares?: string }).winningShares ?? NaN)
      : Number((built as { claimableFeesUsdc?: string }).claimableFeesUsdc ?? NaN) / 1e6;
  const [intent] = await db
    .insert(schema.txIntents)
    .values({
      userId: user.id,
      wallet,
      kind,
      marketId: market?.id ?? null,
      pantaMarketId,
      amountUsdc: Number.isFinite(amount) ? amount.toFixed(6) : null,
      messageB64: compiled.messageB64,
      blockhash: built.recentBlockhash,
      lastValidBlockHeight: built.lastValidBlockHeight ?? null,
      details: { outcome: (built as { outcome?: string }).outcome ?? null },
      status: "built",
    })
    .returning();
  return { intentId: intent.id, transaction: compiled.transactionB64, amountUsdc: Number.isFinite(amount) ? amount : null };
}

// --- withdraw ----------------------------------------------------------------

export async function buildWithdraw(user: UserRow, wallet: string, to: string, amount: number): Promise<BuiltTx> {
  if (!(amount > 0)) throw new HttpError(400, "BAD_REQUEST", "Enter an amount above zero.");
  const t = await buildUsdcTransfer(wallet, to, amount);
  const db = await getDb();
  const [intent] = await db
    .insert(schema.txIntents)
    .values({
      userId: user.id,
      wallet,
      kind: "withdraw",
      amountUsdc: amount.toFixed(6),
      messageB64: t.messageB64,
      blockhash: t.blockhash,
      lastValidBlockHeight: t.lastValidBlockHeight,
      details: { to },
      status: "built",
    })
    .returning();
  return { intentId: intent.id, transaction: t.transactionB64 };
}

// --- market creation ---------------------------------------------------------

export async function quoteCreate(user: UserRow, marketId: string, req: CreateQuoteRequest) {
  const q = await pantaApi.createQuote(req);
  const db = await getDb();
  await db.update(schema.markets).set({ createId: q.createId }).where(eq(schema.markets.id, marketId));
  const [intent] = await db
    .insert(schema.txIntents)
    .values({
      userId: user.id,
      wallet: req.wallet,
      kind: "create",
      marketId,
      pantaCreateId: q.createId,
      amountUsdc: (Number(q.paymentUsdc) / 1e6).toFixed(6),
      details: { request: req, quote: q },
      status: "quoted",
    })
    .returning();
  return {
    intentId: intent.id,
    paymentUsdc: Number(q.paymentUsdc) / 1e6,
    liquidityUsdc: q.liquidityInjectionUsdc ? Number(q.liquidityInjectionUsdc) / 1e6 : null,
    platformUsdc: q.platformRevenueUsdc ? Number(q.platformRevenueUsdc) / 1e6 : null,
    expectedMarketId: q.expectedEventPda,
    expiresAt: q.expiresAt ?? null,
  };
}

export async function buildCreate(user: UserRow, intentId: string): Promise<BuiltTx> {
  let intent = await loadIntent(user.id, intentId);
  if (intent.kind !== "create" || !["quoted", "built", "expired"].includes(intent.status)) {
    throw new HttpError(409, "BAD_REQUEST", "This market was already submitted.");
  }
  let b;
  try {
    b = await pantaApi.createBuild(intent.pantaCreateId!, intent.wallet);
  } catch (e) {
    if (!(e instanceof PantaError) || e.code !== "CREATE_EXPIRED") throw e;
    // Session expired (~5 min): re-quote with the stored request, then build.
    // The original start time may now be inside Panta's minimum start delay.
    const stored = intent.details?.request as CreateQuoteRequest;
    const minStart = Math.floor(Date.now() / 1000) + MIN_START_DELAY_SEC + START_DELAY_BUFFER_SEC;
    const req = { ...stored, startTime: Math.max(stored.startTime, minStart) };
    if (req.endTime <= req.startTime) {
      throw new HttpError(409, "BAD_REQUEST", "Trading would close before Panta lets this market open. Edit the closing time and try again.");
    }
    const q = await pantaApi.createQuote(req);
    intent = await updateIntent(intent.id, { pantaCreateId: q.createId, details: { ...intent.details, request: req, quote: q } });
    const db = await getDb();
    if (intent.marketId) {
      await db
        .update(schema.markets)
        .set({ createId: q.createId, startAt: new Date(req.startTime * 1000) })
        .where(eq(schema.markets.id, intent.marketId));
    }
    b = await pantaApi.createBuild(q.createId, intent.wallet);
  }
  const checked = inspectPrebuilt(b.transaction, intent.wallet);
  await updateIntent(intent.id, {
    status: "built",
    messageB64: checked.messageB64,
    blockhash: b.recentBlockhash,
    lastValidBlockHeight: b.lastValidBlockHeight ?? null,
    details: { ...intent.details, buildFingerprint: b.buildFingerprint ?? null },
  });
  return { intentId: intent.id, transaction: checked.transactionB64, expiresAt: b.expiresAt ?? null };
}

// --- submit + finish -----------------------------------------------------------

export async function submitSigned(user: UserRow, intentId: string, signedB64: string): Promise<SubmitResult> {
  const intent = await loadIntent(user.id, intentId);
  if (intent.status === "confirmed" && intent.signature) return resultFor(intent, "confirmed");
  if (intent.status === "sent" && intent.signature) return resumeIntent(intent);
  if (intent.status !== "built" || !intent.messageB64) throw new HttpError(409, "BAD_REQUEST", "Nothing to submit for this session.");

  // Record the signature before broadcasting so a lost RPC reply can't hide a landed transaction.
  const { signature, raw } = prepareSigned({ signedB64, expectedMessageB64: intent.messageB64, wallet: intent.wallet });
  let row = await updateIntent(intent.id, { status: "sent", signature });
  try {
    await broadcast(raw, signature);
  } catch (e) {
    if (e instanceof HttpError && e.code !== "TX_NOT_FOUND") {
      await updateIntent(row.id, { status: e.code === "TX_EXPIRED" ? "expired" : "failed", errorCode: e.code });
    }
    throw e; // TX_NOT_FOUND keeps "sent"; the client resumes via /api/tx/status
  }
  const state = await waitForConfirmation(signature, 25_000);
  if (state === "failed") {
    row = await updateIntent(row.id, { status: "failed", errorCode: "TX_FAILED" });
    return resultFor(row, "failed", "The transaction failed on Solana.");
  }
  if (state === "pending") return resultFor(row, "sent", "Still confirming. We'll keep checking.");
  row = await finish(row);
  return resultFor(row, row.status === "confirmed" ? "confirmed" : "sent");
}

export async function resume(user: UserRow, intentId: string): Promise<SubmitResult> {
  return resumeIntent(await loadIntent(user.id, intentId));
}

async function resumeIntent(intent: Intent): Promise<SubmitResult> {
  if (!intent.signature) throw new HttpError(409, "BAD_REQUEST", "This session hasn't been signed yet.");
  if (intent.status === "confirmed") return resultFor(intent, "confirmed");
  if (intent.status === "failed" || intent.status === "expired") return resultFor(intent, "failed", errorFor(intent));
  const state = await signatureState(intent.signature);
  if (state === "failed") {
    const row = await updateIntent(intent.id, { status: "failed", errorCode: "TX_FAILED" });
    return resultFor(row, "failed", "The transaction failed on Solana.");
  }
  if (state === "unknown" && (await blockhashExpired(intent.lastValidBlockHeight, intent.createdAt))) {
    // Never landed and can't land any more: free the limit and allow a rebuild.
    const row = await updateIntent(intent.id, { status: "expired", errorCode: "TX_EXPIRED" });
    return resultFor(row, "failed", "The transaction expired before it landed. Nothing was charged.");
  }
  if (state !== "confirmed") return resultFor(intent, "sent");
  const row = await finish(intent);
  return resultFor(row, row.status === "confirmed" ? "confirmed" : "sent");
}

function errorFor(intent: Intent): string | undefined {
  return intent.errorCode === "TX_EXPIRED" ? "The transaction expired before it landed. Nothing was charged." : undefined;
}

/**
 * Cron sweep: finish or expire intents left in "sent" (closed tab, register
 * hiccup, slow confirmation). Panta's register, submit and /trades/ are
 * idempotent, so retrying is safe. Gives up after 30 minutes.
 */
export async function sweepSentIntents(limitRows = 25): Promise<{ finished: number; expired: number; gaveUp: number }> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.txIntents)
    .where(and(eq(schema.txIntents.status, "sent"), lt(schema.txIntents.updatedAt, new Date(Date.now() - 60_000))))
    .orderBy(asc(schema.txIntents.updatedAt))
    .limit(limitRows);
  const out = { finished: 0, expired: 0, gaveUp: 0 };
  for (const r of rows) {
    try {
      const res = await resumeIntent(r);
      if (res.status === "confirmed") out.finished++;
      else if (res.status === "failed") out.expired++;
      else if (Date.now() - r.createdAt.getTime() > 30 * 60_000) {
        await updateIntent(r.id, { status: "failed", errorCode: (r.details?.registerError as string) ?? "UNFINISHED" });
        out.gaveUp++;
      }
    } catch {
      /* try again next run */
    }
  }
  return out;
}

async function resultFor(intent: Intent, status: SubmitResult["status"], message?: string): Promise<SubmitResult> {
  let marketSlug: string | undefined;
  if (intent.marketId) {
    const db = await getDb();
    const m = await db.query.markets.findFirst({ where: eq(schema.markets.id, intent.marketId), columns: { slug: true } });
    marketSlug = m?.slug;
  }
  return {
    intentId: intent.id,
    status,
    signature: intent.signature ?? "",
    explorerUrl: intent.signature ? SOLSCAN_TX(intent.signature) : "",
    marketSlug,
    message,
  };
}

/** Post-confirmation bookkeeping with Panta. Safe to call more than once. */
async function finish(intent: Intent): Promise<Intent> {
  const db = await getDb();
  const sig = intent.signature!;
  const details = { ...(intent.details ?? {}) } as Record<string, unknown>;

  if (intent.kind === "buy") {
    try {
      await pantaApi.orderSubmit({ orderId: intent.pantaOrderId!, signature: sig, wallet: intent.wallet });
      let status = "submitted";
      for (let i = 0; i < 8 && (status === "submitted" || status === "built"); i++) {
        await new Promise((r) => setTimeout(r, 1500));
        status = (await pantaApi.orderVerify({ orderId: intent.pantaOrderId!, signature: sig, wallet: intent.wallet })).status;
      }
      details.pantaOrderStatus = status;
    } catch (e) {
      details.pantaOrderError = e instanceof PantaError ? e.code : String(e);
    }
    await recordTrade(intent, "buy", details);
  } else if (intent.kind === "claim") {
    await recordTrade(intent, "claim", details);
  } else if (intent.kind === "create") {
    let reg = null;
    for (let i = 0; i < 6 && !reg; i++) {
      try {
        reg = await pantaApi.register(intent.pantaCreateId!, sig);
      } catch (e) {
        if (!(e instanceof PantaError) || e.code !== "TX_NOT_FOUND" || i === 5) {
          details.registerError = e instanceof PantaError ? e.code : String(e);
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    if (!reg) return updateIntent(intent.id, { details });
    await db
      .update(schema.markets)
      .set({ pantaMarketId: reg.marketId, status: "live", phase: "primary", createdTxSig: sig, imageUrl: reg.images?.[0] ?? undefined })
      .where(eq(schema.markets.id, intent.marketId!));
    invalidate("/markets/");
  }
  return updateIntent(intent.id, { status: "confirmed", details });
}

async function recordTrade(intent: Intent, kind: "buy" | "claim", details: Record<string, unknown>) {
  const db = await getDb();
  const ref = parseRef(intent.refCode);
  const userId = (details.pantaUserId as string | undefined) ?? pantaUserId(ref);
  try {
    const rep = await pantaApi.reportTrade({
      signature: intent.signature!,
      wallet: intent.wallet,
      marketId: intent.pantaMarketId!,
      quoteId: intent.pantaQuoteId ?? undefined,
      clientOrderId: intent.id,
      userId,
    });
    details.attribution = rep.status;
  } catch (e) {
    details.attribution = e instanceof PantaError ? `error:${e.code}` : "error";
  }
  const excluded = env.excludedWallets().has(intent.wallet) ? "team" : null;
  await db
    .insert(schema.trades)
    .values({
      signature: intent.signature!,
      marketId: intent.marketId,
      pantaMarketId: intent.pantaMarketId!,
      userId: intent.userId,
      wallet: intent.wallet,
      kind,
      side: intent.side,
      amountUsdc: intent.amountUsdc,
      shares: intent.expectedShares,
      refCode: intent.refCode,
      refCreator: ref?.creator ?? null,
      refChannel: ref?.channel ?? null,
      attributionStatus: String(details.attribution ?? ""),
      excludedReason: excluded,
    })
    .onConflictDoNothing();
  invalidate(`/markets/${encodeURIComponent(intent.pantaMarketId!)}/`);
}
