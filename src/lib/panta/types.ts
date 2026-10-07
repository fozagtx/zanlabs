// Types for the Panta public API (https://live-api.panta.market/api/v1).
// Field names follow the official docs (Kaito-HQ/panta-api-pub, 2026-09-17).
// Fields marked "undocumented" were observed on live responses by other builders
// and may be absent; every consumer must treat them as optional.

export type PantaPhase = "primary" | "secondary" | "resolved" | "cancelled";
export type Side = "yes" | "no";

export type PantaErrorBody = {
  code: string;
  message?: string;
  field?: string;
  fields?: Record<string, string[]>;
};

export type MarketItem = {
  marketId: string;
  category?: string;
  title?: string | null;
  description?: string | null;
  images?: string[] | null;
  phase?: PantaPhase | string | null;
  marketType?: "standard" | "breaking" | string;
  startTime?: number | string | null;
  endTime?: number | string | null;
  resolutionTime?: number | string | null;
  region?: string | null;
  resolved?: boolean | null;
  status?: string | null;
  volumeUsdc?: string | number | null;
  campaignId?: string | null;
  createdByPartner?: boolean | null;
  yesPrice?: string | number | null;
  noPrice?: string | number | null;
  primaryYesPrice?: string | number | null;
  primaryNoPrice?: string | number | null;
  secondaryYesPrice?: string | number | null;
  secondaryNoPrice?: string | number | null;
  // undocumented
  question?: string | null;
  resolutionRule?: string | null;
  sources?: string[] | null;
  creatorAddress?: string | null;
  isGraduated?: boolean | null;
  tradingFeeAccrued?: string | number | null;
  totalVolumeUsdc?: string | number | null;
  programId?: string | null;
  outcome?: string | null;
  result?: string | null;
  winningOutcome?: string | null;
  onChain?: boolean | null;
  [key: string]: unknown;
};

export type MarketList = { items: MarketItem[]; nextCursor?: string | null };

export type MarketTrade = {
  id?: string;
  marketId: string;
  wallet: string;
  isPrimary?: boolean;
  yesAmount?: string | number | null;
  noAmount?: string | number | null;
  feePaid?: string | number | null;
  blockTime?: number | string | null;
  signature: string;
  quoteAsset?: string;
};

export type BuiltInstruction = {
  programId: string;
  data: string; // base64
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
};

// --- create market ---------------------------------------------------------
export type CreateQuoteRequest = {
  wallet: string;
  question: string;
  resolutionRule: string;
  sourcesOfTruth: string[];
  category: string;
  startTime: number;
  endTime: number;
  resolutionTime: number;
  imageUrl: string;
  marketType?: "standard" | "breaking";
  title?: string;
  description?: string;
  region?: string;
};

export type CreateQuote = {
  createId: string;
  expectedEventPda: string;
  paymentUsdc: string; // base units
  liquidityInjectionUsdc?: string;
  platformRevenueUsdc?: string;
  marketType?: string;
  expiresAt?: string;
  blockhashExpiryHintSec?: number;
};

export type CreateBuild = {
  createId: string;
  expectedEventPda: string;
  transaction: string; // base64 unsigned VersionedTransaction — do not modify
  recentBlockhash: string;
  lastValidBlockHeight?: number;
  blockhashExpiryHintSec?: number;
  buildFingerprint?: string;
  paymentUsdc?: string;
  expiresAt?: string;
};

export type RegisterResult = {
  createId: string;
  marketId: string;
  status: string;
  signature: string;
  category?: string;
  title?: string;
  images?: string[];
};

export type ImageUpload = {
  uploadUrl: string;
  publicId?: string;
  expiresAt?: string;
  fields: Record<string, string | number | boolean>;
};

// --- primary buy -----------------------------------------------------------
export type OrderQuote = {
  quoteId: string;
  marketId: string;
  side: Side;
  amountUsdc: string;
  shares: string;
  avgPrice?: string;
  feeUsdc?: string;
  expiresAt?: string;
};

export type OrderBuild = {
  orderId: string;
  quoteId: string;
  wallet: string;
  marketId: string;
  side: Side;
  amountUsdc: string;
  expectedShares?: string;
  feeUsdc?: string;
  status: string;
  instructions: BuiltInstruction[];
  recentBlockhash: string;
  lastValidBlockHeight?: number;
  expiresAt?: string;
};

export type OrderStatus = {
  orderId: string;
  status: "built" | "submitted" | "confirmed" | "failed" | "expired" | string;
  signature?: string;
};

// --- positions & claims ----------------------------------------------------
export type PositionRow = {
  marketId: string;
  category?: string;
  side: Side;
  shares: string;
  phase?: PantaPhase | string;
  claimable?: boolean;
  claimed?: boolean;
  outcome?: Side | string | null;
};

export type ClaimBuild = {
  wallet: string;
  marketId: string;
  outcome?: string;
  winningShares?: string;
  instructions: BuiltInstruction[];
  recentBlockhash: string;
  lastValidBlockHeight?: number;
};

export type CreatorFeeBuild = {
  wallet: string;
  marketId: string;
  claimableFeesUsdc: string; // base units
  instructions: BuiltInstruction[];
  recentBlockhash: string;
  lastValidBlockHeight?: number;
};

// --- attribution -----------------------------------------------------------
export type TradeReport = {
  signature: string;
  status: string;
  marketId?: string;
  wallet?: string;
  side?: string;
  kind?: "buy" | "claim" | string;
};

export type AccountDashboard = {
  account?: Record<string, unknown>;
  keys?: { active: number; revoked: number; total: number };
  metrics?: {
    creates?: { total?: number; byStatus?: Record<string, number> };
    trades?: { total?: number; volumeUsdcBase?: string | number; byKind?: Record<string, number> };
  };
  permissions?: { canCreateMarkets?: boolean };
};
