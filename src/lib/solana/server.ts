import "server-only";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import { env } from "../env";
import { HttpError } from "../http";
import type { BuiltInstruction } from "../panta/types";
import { USDC_DECIMALS } from "../config";

// Server-side Solana helpers. The app compiles Panta's instruction lists into
// v0 transactions itself, checks every program and signer against an
// allowlist, hands the unsigned bytes to the user's wallet, then broadcasts
// the signed bytes on its own RPC (Panta does not broadcast).

let conn: Connection | undefined;
export function connection(): Connection {
  conn ??= new Connection(env.rpcUrl(), { commitment: "confirmed" });
  return conn;
}

const MEMO_V1 = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";
const MEMO_V2 = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";


// Top-level instructions a Panta-built transaction may contain. Value moves
// happen inside Panta's program; a direct System or Token instruction at the
// top level (a transfer or approve from the user's account) is refused.
function assertTopLevel(programId: string, data: Uint8Array) {
  const panta = new Set(env.pantaPrograms());
  if (panta.has(programId)) return;
  if (programId === ComputeBudgetProgram.programId.toBase58()) return;
  if (programId === MEMO_V1 || programId === MEMO_V2) return;
  if (programId === ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()) {
    // 0/empty = Create, 1 = CreateIdempotent. RecoverNested (2) is refused.
    if (data.length === 0 || (data.length === 1 && (data[0] === 0 || data[0] === 1))) return;
  }
  throw new HttpError(422, "UNEXPECTED_PROGRAM", undefined, { programId });
}

export function assertSafeInstructions(ixs: BuiltInstruction[], wallet: string): void {
  if (!Array.isArray(ixs) || ixs.length === 0) throw new HttpError(422, "SANDBOX_NO_TX");
  for (const ix of ixs) {
    assertTopLevel(ix.programId, Buffer.from(ix.data ?? "", "base64"));
    for (const a of ix.accounts) {
      if (a.isSigner && a.pubkey !== wallet) throw new HttpError(422, "UNEXPECTED_SIGNER", undefined, { signer: a.pubkey });
    }
  }
}

export type CompiledTx = {
  transactionB64: string; // unsigned VersionedTransaction for the wallet
  messageB64: string; // what we expect back, byte for byte
};

export function compileForWallet(ixs: BuiltInstruction[], wallet: string, recentBlockhash: string): CompiledTx {
  assertSafeInstructions(ixs, wallet);
  const instructions = ixs.map(
    (ix) =>
      new TransactionInstruction({
        programId: new PublicKey(ix.programId),
        keys: ix.accounts.map((a) => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
        data: Buffer.from(ix.data, "base64"),
      }),
  );
  const message = new TransactionMessage({
    payerKey: new PublicKey(wallet),
    recentBlockhash,
    instructions,
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  return {
    transactionB64: Buffer.from(tx.serialize()).toString("base64"),
    messageB64: Buffer.from(message.serialize()).toString("base64"),
  };
}

/** Validate a transaction Panta built in full (market creation). It must not be modified. */
export function inspectPrebuilt(txB64: string, wallet: string): CompiledTx {
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(Buffer.from(txB64, "base64"));
  } catch {
    throw new HttpError(502, "TX_MISMATCH", "Panta returned a transaction we couldn't read.");
  }
  const msg = tx.message;
  const keys = msg.staticAccountKeys.map((k) => k.toBase58());
  const signers = keys.slice(0, msg.header.numRequiredSignatures);
  if (signers.length !== 1 || signers[0] !== wallet) {
    throw new HttpError(422, "UNEXPECTED_SIGNER", undefined, { signers });
  }
  for (const ix of msg.compiledInstructions) {
    const pid = keys[ix.programIdIndex];
    if (!pid) throw new HttpError(422, "UNEXPECTED_PROGRAM");
    assertTopLevel(pid, ix.data);
  }
  return { transactionB64: txB64, messageB64: Buffer.from(msg.serialize()).toString("base64") };
}

/**
 * Check a wallet-signed transaction is exactly what we prepared and return its
 * signature (the transaction id) before anything is broadcast, so the caller
 * can record it first and never lose track of a transaction that lands.
 */
export function prepareSigned(params: { signedB64: string; expectedMessageB64: string; wallet: string }): { signature: string; raw: Uint8Array } {
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(Buffer.from(params.signedB64, "base64"));
  } catch {
    throw new HttpError(400, "TX_TAMPERED");
  }
  const msgB64 = Buffer.from(tx.message.serialize()).toString("base64");
  if (msgB64 !== params.expectedMessageB64) throw new HttpError(400, "TX_TAMPERED");
  const keys = tx.message.staticAccountKeys.map((k) => k.toBase58());
  const idx = keys.indexOf(params.wallet);
  const sig = idx >= 0 ? tx.signatures[idx] : undefined;
  if (!sig || sig.every((b) => b === 0)) throw new HttpError(400, "TX_TAMPERED", "The transaction wasn't signed by your wallet.");
  const first = tx.signatures[0];
  if (!first || first.every((b) => b === 0)) throw new HttpError(400, "TX_TAMPERED", "The transaction is missing its fee-payer signature.");
  return { signature: bs58.encode(first), raw: tx.serialize() };
}

/**
 * Broadcast. If the RPC call errors, ask the chain whether the signature
 * landed anyway before reporting a failure (a lost reply must not look like
 * a failed buy).
 */
export async function broadcast(raw: Uint8Array, signature: string): Promise<void> {
  try {
    await connection().sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 });
  } catch (e) {
    const state = await signatureState(signature).catch(() => "unknown" as const);
    if (state === "confirmed" || state === "pending") return;
    const msg = (e as Error).message ?? "";
    if (/blockhash not found|block height exceeded/i.test(msg)) throw new HttpError(409, "TX_EXPIRED");
    if (/insufficient (funds|lamports)|0x1\b/i.test(msg)) throw new HttpError(400, "INSUFFICIENT_SOL", "Not enough SOL or USDC to cover this transaction.");
    if (/simulation failed|custom program error|instruction/i.test(msg)) throw new HttpError(400, "TX_FAILED", `Solana rejected the transaction: ${msg.slice(0, 200)}`);
    // Unknown transport problem: let the caller keep the intent as "sent" and resume.
    throw new HttpError(503, "TX_NOT_FOUND", "We couldn't confirm the send yet. We'll keep checking.");
  }
}

/** True once the network has moved past the transaction's blockhash window. */
export async function blockhashExpired(lastValidBlockHeight: number | null, createdAt: Date): Promise<boolean> {
  // Without a block height from Panta, fall back to age: blockhashes live ~60-90s.
  if (lastValidBlockHeight === null) return Date.now() - createdAt.getTime() > 5 * 60_000;
  try {
    return (await connection().getBlockHeight("confirmed")) > lastValidBlockHeight;
  } catch {
    return false;
  }
}

/** Wait for confirmation. Returns "confirmed", "failed" or "pending" (timed out). */
export async function waitForConfirmation(signature: string, timeoutMs = 40_000): Promise<"confirmed" | "failed" | "pending"> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value } = await connection().getSignatureStatuses([signature], { searchTransactionHistory: false });
    const st = value[0];
    if (st?.err) return "failed";
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return "confirmed";
    await new Promise((r) => setTimeout(r, 1200));
  }
  return "pending";
}

export async function signatureState(signature: string): Promise<"confirmed" | "failed" | "pending" | "unknown"> {
  const { value } = await connection().getSignatureStatuses([signature], { searchTransactionHistory: true });
  const st = value[0];
  if (!st) return "unknown";
  if (st.err) return "failed";
  if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") return "confirmed";
  return "pending";
}

export async function balances(address: string): Promise<{ sol: number; usdc: number }> {
  const owner = new PublicKey(address);
  const [lamports, tokenAccounts] = await Promise.all([
    connection().getBalance(owner),
    connection().getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(env.usdcMint()) }),
  ]);
  let usdc = 0;
  for (const acc of tokenAccounts.value) {
    const info = acc.account.data.parsed?.info?.tokenAmount;
    if (info?.uiAmount) usdc += Number(info.uiAmount);
  }
  return { sol: lamports / 1e9, usdc };
}

const existsCache = new Map<string, { at: number; v: boolean }>();
export async function accountExists(address: string): Promise<boolean> {
  const hit = existsCache.get(address);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.v;
  try {
    const info = await connection().getAccountInfo(new PublicKey(address));
    const v = info !== null;
    existsCache.set(address, { at: Date.now(), v });
    return v;
  } catch {
    return true; // RPC trouble: don't hide markets because of our own outage
  }
}

export async function buildUsdcTransfer(from: string, to: string, amount: number): Promise<CompiledTx & { blockhash: string; lastValidBlockHeight: number }> {
  let toKey: PublicKey;
  try {
    toKey = new PublicKey(to);
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "That isn't a valid Solana address.");
  }
  const mint = new PublicKey(env.usdcMint());
  const owner = new PublicKey(from);
  const fromAta = getAssociatedTokenAddressSync(mint, owner, false);
  const base = BigInt(Math.floor(amount * 10 ** USDC_DECIMALS + 1e-6));
  const instructions: TransactionInstruction[] = [];
  if (PublicKey.isOnCurve(toKey.toBytes())) {
    // A normal wallet address: pay into its USDC account (created if needed).
    const toAta = getAssociatedTokenAddressSync(mint, toKey, false);
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(owner, toAta, toKey, mint),
      createTransferCheckedInstruction(fromAta, mint, toAta, owner, base, USDC_DECIMALS),
    );
  } else {
    // Off-curve: only accept an existing USDC token account (some exchanges show those).
    const info = await connection().getParsedAccountInfo(toKey);
    const parsed = (info.value?.data as { parsed?: { type?: string; info?: { mint?: string } } } | undefined)?.parsed;
    if (parsed?.type !== "account" || parsed.info?.mint !== mint.toBase58()) {
      throw new HttpError(400, "BAD_REQUEST", "That address can't receive USDC safely. Use a Solana wallet address or a USDC deposit address.");
    }
    instructions.push(createTransferCheckedInstruction(fromAta, mint, toKey, owner, base, USDC_DECIMALS));
  }
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash("confirmed");
  const message = new TransactionMessage({ payerKey: owner, recentBlockhash: blockhash, instructions }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  return {
    transactionB64: Buffer.from(tx.serialize()).toString("base64"),
    messageB64: Buffer.from(message.serialize()).toString("base64"),
    blockhash,
    lastValidBlockHeight,
  };
}
