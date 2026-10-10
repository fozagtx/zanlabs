import {
  bigint,
  bigserial,
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Panta is the source of truth for prices, positions and outcomes of Panta
// markets. This database owns identity, creator profiles, share attribution,
// integrity lists, free calls and a price history Panta does not keep.

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    privyDid: text("privy_did").notNull().unique(),
    handle: text("handle").unique(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    refCode: text("ref_code").notNull().unique(),
    role: text("role", { enum: ["fan", "creator"] }).notNull().default("fan"),
    countryCode: text("country_code"),
    ageAttestedAt: ts("age_attested_at"),
    activeWallet: text("active_wallet"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    bannedAt: ts("banned_at"),
  },
  (t) => [index("users_role_idx").on(t.role)],
);

export const wallets = pgTable(
  "wallets",
  {
    address: text("address").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["embedded", "external"] }).notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("wallets_user_idx").on(t.userId)],
);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    provider: text("provider", { enum: ["x", "instagram", "tiktok"] }).notNull(),
    subject: text("subject").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    username: text("username"),
    profilePictureUrl: text("profile_picture_url"),
    verifiedAt: ts("verified_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.subject] }), index("social_user_idx").on(t.userId)],
);

export const creatorProfiles = pgTable("creator_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  createWallet: text("create_wallet").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  audienceAdultAttestedAt: ts("audience_adult_attested_at").notNull(),
  disclosureAcceptedAt: ts("disclosure_accepted_at").notNull(),
  realMoneyEnabled: boolean("real_money_enabled").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const restrictedTraders = pgTable(
  "restricted_traders",
  {
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wallet: text("wallet").notNull(),
    relation: text("relation").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.creatorId, t.wallet] }), index("restricted_wallet_idx").on(t.wallet)],
);

export const markets = pgTable(
  "markets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    kind: text("kind", { enum: ["panta", "forecast"] }).notNull(),
    status: text("status", { enum: ["draft", "live", "closed", "resolved", "void"] }).notNull().default("draft"),
    pantaMarketId: text("panta_market_id").unique(),
    createId: text("create_id"),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id),
    question: text("question").notNull(),
    resolutionRule: text("resolution_rule").notNull(),
    sources: jsonb("sources").$type<string[]>().notNull(),
    category: text("category").notNull(),
    tier: text("tier", { enum: ["A", "B"] }).notNull(),
    template: text("template"),
    creatorCall: text("creator_call", { enum: ["yes", "no"] }),
    startAt: ts("start_at").notNull(),
    endAt: ts("end_at").notNull(),
    resolutionAt: ts("resolution_at").notNull(),
    imageUrl: text("image_url"),
    phase: text("phase"),
    outcome: text("outcome", { enum: ["yes", "no", "void"] }),
    resolvedAt: ts("resolved_at"),
    resolutionNote: text("resolution_note"),
    yesPrice: numeric("yes_price", { precision: 9, scale: 6 }),
    volumeUsdc: numeric("volume_usdc", { precision: 18, scale: 6 }),
    restrictedTradeFlaggedAt: ts("restricted_trade_flagged_at"),
    lastSyncedAt: ts("last_synced_at"),
    createdTxSig: text("created_tx_sig"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("markets_creator_idx").on(t.creatorId),
    index("markets_status_idx").on(t.status),
    index("markets_end_idx").on(t.endAt),
  ],
);

export const marketSnapshots = pgTable(
  "market_snapshots",
  {
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    at: ts("at").notNull().defaultNow(),
    yesPrice: numeric("yes_price", { precision: 9, scale: 6 }),
    volumeUsdc: numeric("volume_usdc", { precision: 18, scale: 6 }),
  },
  (t) => [primaryKey({ columns: [t.marketId, t.at] })],
);

export const txIntents = pgTable(
  "tx_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    wallet: text("wallet").notNull(),
    kind: text("kind", { enum: ["create", "buy", "claim", "creator_fee", "withdraw"] }).notNull(),
    marketId: uuid("market_id").references(() => markets.id),
    pantaMarketId: text("panta_market_id"),
    side: text("side", { enum: ["yes", "no"] }),
    amountUsdc: numeric("amount_usdc", { precision: 18, scale: 6 }),
    expectedShares: numeric("expected_shares", { precision: 28, scale: 9 }),
    refCode: text("ref_code"),
    pantaCreateId: text("panta_create_id"),
    pantaQuoteId: text("panta_quote_id"),
    pantaOrderId: text("panta_order_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    messageB64: text("message_b64"),
    blockhash: text("blockhash"),
    lastValidBlockHeight: bigint("last_valid_block_height", { mode: "number" }),
    status: text("status", { enum: ["quoted", "built", "sent", "confirmed", "failed", "expired"] }).notNull(),
    signature: text("signature").unique(),
    errorCode: text("error_code"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("intents_user_idx").on(t.userId), index("intents_created_idx").on(t.createdAt)],
);

export const trades = pgTable(
  "trades",
  {
    signature: text("signature").primaryKey(),
    marketId: uuid("market_id").references(() => markets.id),
    pantaMarketId: text("panta_market_id").notNull(),
    userId: uuid("user_id").references(() => users.id),
    wallet: text("wallet").notNull(),
    kind: text("kind", { enum: ["buy", "claim"] }).notNull(),
    side: text("side", { enum: ["yes", "no"] }),
    amountUsdc: numeric("amount_usdc", { precision: 18, scale: 6 }),
    shares: numeric("shares", { precision: 28, scale: 9 }),
    refCode: text("ref_code"),
    refCreator: text("ref_creator"),
    refChannel: text("ref_channel"),
    attributionStatus: text("attribution_status"),
    excludedReason: text("excluded_reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("trades_market_idx").on(t.marketId),
    index("trades_user_idx").on(t.userId),
    index("trades_wallet_idx").on(t.wallet),
  ],
);

export const forecasts = pgTable(
  "forecasts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    side: text("side", { enum: ["yes", "no"] }).notNull(),
    refCode: text("ref_code"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.marketId] }), index("forecasts_market_idx").on(t.marketId)],
);

export const shareEvents = pgTable(
  "share_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    marketId: uuid("market_id").references(() => markets.id, { onDelete: "cascade" }),
    creatorHandle: text("creator_handle"),
    channel: text("channel").notNull(),
    event: text("event", { enum: ["share", "visit"] }).notNull(),
    userId: uuid("user_id"),
    visitorId: text("visitor_id"),
    browser: text("browser"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("share_market_idx").on(t.marketId, t.event), uniqueIndex("share_visit_once").on(t.marketId, t.visitorId, t.event, t.channel)],
);

export const playLimits = pgTable("play_limits", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  dailyLimitUsdc: numeric("daily_limit_usdc", { precision: 18, scale: 6 }).notNull(),
  pendingLimitUsdc: numeric("pending_limit_usdc", { precision: 18, scale: 6 }),
  pendingEffectiveAt: ts("pending_effective_at"),
  timeoutUntil: ts("timeout_until"),
  selfExcludedAt: ts("self_excluded_at"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});
