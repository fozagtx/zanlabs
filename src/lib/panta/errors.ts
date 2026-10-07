// Maps Panta error codes (docs: guides/errors.mdx) and app-level codes to
// plain-language messages. Shared by server routes and client UI.

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "The app's Panta key was rejected. Ask the team to check its configuration.",
  CREATE_NOT_PERMITTED: "Market creation is turned off for this app's Panta account.",
  FORBIDDEN: "Panta refused this request.",
  INVALID_MARKET_PARAMS: "Panta couldn't accept these market details. Check the fields and try again.",
  DUPLICATE_MARKET: "You already created a market with this exact question. Add a date or detail to make it unique.",
  CREATE_EXPIRED: "The creation session expired. We'll prepare a fresh one.",
  QUOTE_EXPIRED: "The price expired. Getting a fresh one.",
  QUOTE_STALE: "The price moved before your pick went through. Getting a fresh one.",
  AMOUNT_TOO_SMALL: "That amount is below Panta's minimum. Try a larger amount.",
  MARKET_NOT_FOUND: "Panta couldn't find this market.",
  MARKET_NOT_IN_PRIMARY: "This market can't be bought in the app right now. You can still view it on panta.market.",
  NOT_CLAIMABLE: "Claim opens when Panta finalizes the result.",
  NOT_MARKET_CREATOR: "Only the wallet that created this market can claim its creator fees.",
  MARKET_NOT_GRADUATED: "Creator fees are still accruing and unlock when the market graduates.",
  NO_CREATOR_FEES: "No creator fees to claim on this market yet.",
  UPLOAD_NOT_CONFIGURED: "Image upload isn't available on Panta right now.",
  TX_NOT_FOUND: "Your transaction hasn't landed yet. Retrying.",
  TX_FAILED: "The transaction failed on Solana. Nothing was charged except network fees.",
  TX_MISMATCH: "Panta couldn't match this transaction to the order.",
  TX_FEE_MISMATCH: "The transaction fee didn't match the quote.",
  RATE_LIMITED: "Lots of picks right now. Hang on a moment and try again.",
  INTERNAL_ERROR: "Panta had a problem. Try again shortly.",
  // app-level codes
  PANTA_NOT_CONFIGURED: "Trading isn't set up on this deployment yet (missing Panta API key).",
  AUTH_REQUIRED: "Sign in to continue.",
  AUTH_NOT_CONFIGURED: "Sign-in isn't set up on this deployment yet.",
  WALLET_NOT_OWNED: "That wallet isn't linked to your account.",
  REGION_BLOCKED: "Real-money picks aren't available in your region. You can still make free calls.",
  AGE_REQUIRED: "Confirm you're 18 or older to make real-money picks.",
  RESTRICTED_TRADER: "Creators and their teams can't trade their own markets.",
  DAILY_LIMIT: "This pick would go over your daily play limit.",
  TIMED_OUT: "You've taken a break from real-money picks. It ends at the time you chose.",
  SELF_EXCLUDED: "You've excluded yourself from real-money picks.",
  UNEXPECTED_PROGRAM: "The transaction contained an unexpected program, so we stopped it for your safety.",
  UNEXPECTED_SIGNER: "The transaction asked for an unexpected signer, so we stopped it for your safety.",
  TX_TAMPERED: "Your wallet changed the transaction before signing (some wallets add their own fees), so we stopped it. Try again, or use your Zan wallet.",
  TX_EXPIRED: "The transaction expired before it landed. Please try again.",
  SANDBOX_NO_TX: "Panta sandbox keys return no transaction to sign. Switch to a live key to trade on mainnet.",
  NOT_FOUND: "Not found.",
  BAD_REQUEST: "Something in the request wasn't right.",
  RATE_LIMITED_APP: "Slow down a little and try again.",
  NOT_CREATOR: "Set up your creator profile first.",
  LINT_BLOCKED: "This market isn't allowed. Check the highlighted rules.",
  TIER_FORECAST_ONLY: "This call is about something you control, so it runs as a free call with no money.",
  REAL_MONEY_OFF: "Real-money markets aren't available for creators in your region yet. Post a free call instead.",
  MARKET_CLOSED: "This market is closed.",
  INSUFFICIENT_USDC: "Not enough USDC in your wallet for this.",
  INSUFFICIENT_SOL: "You need a little SOL for network fees.",
};

export function errorMessage(code: string | undefined, fallback?: string): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  return fallback || "Something went wrong. Please try again.";
}

export const RETRYABLE = new Set(["QUOTE_EXPIRED", "QUOTE_STALE", "CREATE_EXPIRED", "TX_NOT_FOUND", "RATE_LIMITED"]);
