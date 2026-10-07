// DTOs shared between API routes and client components.

export type CreatorBadge = {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  socials: { provider: "x" | "instagram" | "tiktok"; username: string | null }[];
};

export type MarketView = {
  id: string;
  slug: string;
  kind: "panta" | "forecast";
  status: "draft" | "live" | "closed" | "resolved" | "void";
  phase: string | null;
  question: string;
  resolutionRule: string;
  sources: string[];
  category: string;
  tier: "A" | "B";
  creatorCall: "yes" | "no" | null;
  startAt: number;
  endAt: number;
  resolutionAt: number;
  imageUrl: string | null;
  outcome: "yes" | "no" | "void" | null;
  resolutionNote: string | null;
  yes: number | null;
  volumeUsdc: number | null;
  pantaMarketId: string | null;
  pantaUrl: string | null;
  buyable: boolean;
  restrictedFlag: boolean;
  lastSyncedAt: number | null;
  creator: CreatorBadge;
  counts: { traders: number; calls: number; comments: number; callsYes: number; callsNo: number };
  reactions: Record<"fire" | "cap" | "eyes" | "clap", number>;
};

export type CatalogMarket = {
  marketId: string;
  title: string | null;
  category: string | null;
  image: string | null;
  phase: string | null;
  yes: number | null;
  volumeUsdc: number | null;
  endTime: number | null;
};

export type MeView = {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  refCode: string;
  role: "fan" | "creator";
  countryCode: string | null;
  detectedCountry: string | null;
  realMoneyRegion: boolean;
  ageAttested: boolean;
  activeWallet: string | null;
  wallets: { address: string; kind: "embedded" | "external" }[];
  socials: { provider: "x" | "instagram" | "tiktok"; username: string | null }[];
  creator: null | {
    createWallet: string;
    jurisdiction: string;
    realMoneyEnabled: boolean;
    restricted: { wallet: string; relation: string }[];
  };
  unreadNotifications: number;
};

export type TxStep = "quote" | "build" | "sign" | "send" | "confirm" | "done";

export type BuiltTx = {
  intentId: string;
  transaction: string; // base64 unsigned VersionedTransaction
  expiresAt?: string | null;
};

export type SubmitResult = {
  intentId: string;
  status: "confirmed" | "sent" | "failed";
  signature: string;
  explorerUrl: string;
  marketSlug?: string;
  message?: string;
};
