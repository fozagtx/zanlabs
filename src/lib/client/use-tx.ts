"use client";

import { useCallback } from "react";
import { api, ApiError } from "./api";
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
      let res: SubmitResult;
      try {
        res = await api<SubmitResult>("/api/tx/submit", { body: { intentId: built.intentId, signedTransaction: signed } });
      } catch (e) {
        // A timeout or lost reply doesn't mean the transaction failed: the
        // server recorded the signature first, so ask for its status.
        const err = e as ApiError;
        const definitive = err instanceof ApiError && err.status >= 400 && err.status < 500 && err.code !== "TX_NOT_FOUND";
        if (definitive) throw e;
        await new Promise((r) => setTimeout(r, 2500));
        res = await api<SubmitResult>(`/api/tx/status?intentId=${built.intentId}`);
      }
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
