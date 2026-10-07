// App-wide constants shared by server and client code.

export const APP_NAME = "Zan";
export const APP_TAGLINE = "Back or fade your favorite creator's call.";

export const PANTA_SITE_URL = "https://panta.market";
export const POWERED_BY_PANTA = "Powered by Panta"; // exact wording required by Panta Terms §6.3

export const USDC_DECIMALS = 6;
export const SOLANA_CHAIN = "solana:mainnet" as const;

// Panta's documented categories (GET /categories/).
export const CATEGORIES = [
  "sports",
  "crypto",
  "politics",
  "entertainment",
  "finance",
  "science",
  "world",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Fan stake presets in USDC. Default is the smallest one.
export const STAKE_PRESETS = [1, 5, 10] as const;
export const DEFAULT_STAKE = 1;
export const MAX_SINGLE_STAKE = 250;

// Play limits (USDC per UTC day). Raising a limit takes effect after a cooling-off period.
export const DEFAULT_DAILY_LIMIT = 25;
export const MAX_DAILY_LIMIT = 1000;
export const LIMIT_COOLING_OFF_HOURS = 24;

// Panta timing rules.
export const MIN_START_DELAY_SEC = 3600; // on-chain minimumStartDelay, typically 3600s
export const START_DELAY_BUFFER_SEC = 300; // headroom so the quote is not rejected
export const DEFAULT_SLIPPAGE_BPS = 100;

// Leaderboards need a minimum number of resolved calls before ranking someone.
export const LEADERBOARD_MIN_CALLS = 3;

// Share channels used in referral codes (?r=<handle>.<channel>[.<sharer>]).
export const SHARE_CHANNELS = {
  wa_chat: "WhatsApp chat",
  wa_status: "WhatsApp Status",
  ig_story: "Instagram Story",
  tt_bio: "TikTok",
  x_post: "X",
  qr: "QR code",
  copy: "Copied link",
  native: "Share sheet",
} as const;
export type ShareChannel = keyof typeof SHARE_CHANNELS;

// Countries where real-money trading/promotion is off by default (forecast-only).
// Sources: research report risk register (Oct 2026). Override with REAL_MONEY_BLOCKED_COUNTRIES.
export const DEFAULT_REAL_MONEY_BLOCKED = [
  // Sanctioned / OFAC-restricted
  "CU", "IR", "KP", "SY", "RU", "BY",
  // Unregistered event contracts or prediction-market/gambling enforcement
  "US", "GB", "FR", "NL", "PT", "HU", "BE", "CH", "PL", "DE", "IT", "SG", "TH", "AU", "CA",
  // Promotion banned or event contracts banned
  "IN", "BR", "KE",
  // Gray zone until a local legal opinion exists
  "NG",
] as const;

export const SOLSCAN_TX = (sig: string) => `https://solscan.io/tx/${sig}`;
export const SOLSCAN_ACCOUNT = (addr: string) => `https://solscan.io/account/${addr}`;
