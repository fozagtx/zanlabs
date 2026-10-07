import "server-only";
import { DEFAULT_REAL_MONEY_BLOCKED } from "./config";

// Server-side environment access. Values are read lazily so pages can render a
// clear "setup required" state instead of crashing when a key is missing.

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function list(name: string): string[] {
  return (read(name) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  appUrl: () => read("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",

  pantaKey: () => read("PANTA_API_KEY"),
  pantaUrl: () => read("PANTA_API_URL") ?? "https://live-api.panta.market/api/v1",
  pantaPrograms: () => {
    const ids = list("PANTA_PROGRAM_IDS");
    return ids.length
      ? ids
      : ["6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp", "4CQ4LWv7194V3Qe3iEYZq33cFPQbmKU3e1xVQkpTegLU"];
  },
  pantaSandbox: () => (read("PANTA_API_KEY") ?? "").startsWith("pk_test_"),

  privyAppId: () => read("NEXT_PUBLIC_PRIVY_APP_ID"),
  privySecret: () => read("PRIVY_APP_SECRET"),

  rpcUrl: () => read("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com",
  usdcMint: () => read("USDC_MINT") ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",

  databaseUrl: () => read("DATABASE_URL"),
  autoMigrate: () => read("AUTO_MIGRATE") !== "false",

  blockedCountries: () => {
    const custom = list("REAL_MONEY_BLOCKED_COUNTRIES").map((c) => c.toUpperCase());
    return new Set<string>(custom.length ? custom : DEFAULT_REAL_MONEY_BLOCKED);
  },
  devCountry: () => read("DEV_COUNTRY")?.toUpperCase(),
  excludedWallets: () => new Set(list("EXCLUDED_WALLETS")),

  cronSecret: () => read("CRON_SECRET"),

  llm: () => {
    const url = read("LLM_API_URL");
    const key = read("LLM_API_KEY");
    const model = read("LLM_MODEL");
    return url && key && model ? { url, key, model } : undefined;
  },
};

export type SetupStatus = {
  panta: boolean;
  pantaSandbox: boolean;
  privy: boolean;
  database: "postgres" | "embedded";
  rpcIsPublic: boolean;
  llm: boolean;
  cron: boolean;
};

export function setupStatus(): SetupStatus {
  return {
    panta: Boolean(env.pantaKey()),
    pantaSandbox: env.pantaSandbox(),
    privy: Boolean(env.privyAppId() && env.privySecret()),
    database: env.databaseUrl() ? "postgres" : "embedded",
    rpcIsPublic: env.rpcUrl().includes("api.mainnet-beta.solana.com"),
    llm: Boolean(env.llm()),
    cron: Boolean(env.cronSecret()),
  };
}
