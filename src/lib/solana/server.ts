import "server-only";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
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

export function allowedPrograms(): Set<string> {
  return new Set([
    ...env.pantaPrograms(),
    SystemProgram.programId.toBase58(),
    TOKEN_PROGRAM_ID.toBase58(),
    TOKEN_2022_PROGRAM_ID.toBase58(),
    ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
    ComputeBudgetProgram.programId.toBase58(),
    MEMO_V1,
    MEMO_V2,
  ]);
}

export function assertSafeInstructions(ixs: BuiltInstruction[], wallet: string): void {
  if (!Array.isArray(ixs) || ixs.length === 0) throw new HttpError(422, "SANDBOX_NO_TX");
  const allowed = allowedPrograms();
  for (const ix of ixs) {
    if (!allowed.has(ix.programId)) {
      throw new HttpError(422, "UNEXPECTED_PROGRAM", undefined, { programId: ix.programId });
    }
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
  const allowed = allowedPrograms();
  for (const ix of msg.compiledInstructions) {
    const pid = keys[ix.programIdIndex];
    if (!pid || !allowed.has(pid)) throw new HttpError(422, "UNEXPECTED_PROGRAM", undefined, { programId: pid });
  }
  return { transactionB64: txB64, messageB64: Buffer.from(msg.serialize()).toString("base64") };
}

/** Broadcast a wallet-signed transaction after checking it is exactly what we prepared. */
export async function broadcastSigned(params: {
  signedB64: string;
  expectedMessageB64: string;
  wallet: string;
}): Promise<{ signature: string; tx: VersionedTransaction }> {
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

  try {
    const signature = await connection().sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });
    return { signature, tx };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/blockhash not found|block height exceeded/i.test(msg)) throw new HttpError(409, "TX_EXPIRED");
    if (/insufficient (funds|lamports)|0x1\b/i.test(msg)) throw new HttpError(400, "INSUFFICIENT_SOL", "Not enough SOL or USDC to cover this transaction.");
    throw new HttpError(400, "TX_FAILED", `Solana rejected the transaction: ${msg.slice(0, 200)}`);
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
  const fromAta = getAssociatedTokenAddressSync(mint, owner, true);
  const toAta = getAssociatedTokenAddressSync(mint, toKey, true);
  const base = BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [
      createAssociatedTokenAccountIdempotentInstruction(owner, toAta, toKey, mint),
      createTransferCheckedInstruction(fromAta, mint, toAta, owner, base, USDC_DECIMALS),
    ],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  return {
    transactionB64: Buffer.from(tx.serialize()).toString("base64"),
    messageB64: Buffer.from(message.serialize()).toString("base64"),
    blockhash,
    lastValidBlockHeight,
  };
}
