"use client";

import { useCallback } from "react";
import { api } from "./api";
import { useSession } from "./session";
import type { BuiltTx, SubmitResult } from "../types";

export type TxPhase = "idle" | "preparing" | "signing" | "sending" | "confirming" | "done" | "failed";

// Sign a server-prepared transaction with the user's wallet, hand the signed
// bytes back to the server to broadcast, and wait for Panta bookkeeping.
export function useTxRunner() {
  const { signTransaction } = useSession();
  return useCallback(
    async (built: BuiltTx, wallet: string, onPhase: (p: TxPhase) => void): Promise<SubmitResult> => {
      onPhase("signing");
      const signed = await signTransaction(built.transaction, wallet);
      onPhase("sending");
      let res = await api<SubmitResult>("/api/tx/submit", { body: { intentId: built.intentId, signedTransaction: signed } });
      onPhase("confirming");
      const deadline = Date.now() + 120_000;
      while (res.status === "sent" && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2500));
        res = await api<SubmitResult>(`/api/tx/status?intentId=${built.intentId}`);
      }
      onPhase(res.status === "confirmed" ? "done" : res.status === "failed" ? "failed" : "confirming");
      return res;
    },
    [signTransaction],
  );
}
