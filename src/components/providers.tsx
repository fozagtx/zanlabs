"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { Toaster } from "sonner";
import { NoAuthSession, PrivySession } from "@/lib/client/session";

export function Providers({ privyAppId, rpcUrl, children }: { privyAppId: string | null; rpcUrl: string; children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 } } }),
  );
  const [connectors] = useState(() => toSolanaWalletConnectors({ shouldAutoConnect: true }));
  const [rpcs] = useState(() => ({
    "solana:mainnet": {
      rpc: createSolanaRpc(rpcUrl),
      rpcSubscriptions: createSolanaRpcSubscriptions(rpcUrl.replace(/^http/, "ws")),
      blockExplorerUrl: "https://solscan.io",
    },
  }));

  const app = privyAppId ? (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: { theme: "#1b1329", accentColor: "#FF6B5B", walletChainType: "solana-only", landingHeader: "Sign in to make your call" },
        loginMethods: ["email", "sms", "google", "apple", "twitter", "wallet"],
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" }, ethereum: { createOnLogin: "off" } },
        externalWallets: { solana: { connectors } },
        solana: { rpcs },
      }}
    >
      <PrivySession>{children}</PrivySession>
    </PrivyProvider>
  ) : (
    <NoAuthSession>{children}</NoAuthSession>
  );

  return (
    <QueryClientProvider client={qc}>
      {app}
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
