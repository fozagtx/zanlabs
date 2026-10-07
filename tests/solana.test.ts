import { describe, expect, it } from "vitest";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { compileForWallet, inspectPrebuilt } from "@/lib/solana/server";
import type { BuiltInstruction } from "@/lib/panta/types";

const PANTA = "6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp";
const blockhash = "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi";

function ix(programId: string, signer: string, extra: string[] = []): BuiltInstruction {
  return {
    programId,
    data: Buffer.from([1, 2, 3]).toString("base64"),
    accounts: [{ pubkey: signer, isSigner: true, isWritable: true }, ...extra.map((p) => ({ pubkey: p, isSigner: false, isWritable: true }))],
  };
}

describe("compileForWallet", () => {
  const wallet = Keypair.generate().publicKey.toBase58();

  it("compiles allowed Panta instructions into an unsigned v0 transaction paid by the wallet", () => {
    const out = compileForWallet([ix(PANTA, wallet, [Keypair.generate().publicKey.toBase58()])], wallet, blockhash);
    const tx = VersionedTransaction.deserialize(Buffer.from(out.transactionB64, "base64"));
    expect(tx.message.staticAccountKeys[0].toBase58()).toBe(wallet);
    expect(tx.signatures.every((s) => s.every((b) => b === 0))).toBe(true);
    expect(Buffer.from(tx.message.serialize()).toString("base64")).toBe(out.messageB64);
  });

  it("refuses unknown programs", () => {
    const rogue = Keypair.generate().publicKey.toBase58();
    expect(() => compileForWallet([ix(rogue, wallet)], wallet, blockhash)).toThrow(/unexpected program/i);
  });

  it("refuses extra signers", () => {
    const other = Keypair.generate().publicKey.toBase58();
    expect(() => compileForWallet([ix(PANTA, other)], wallet, blockhash)).toThrow(/unexpected signer/i);
  });

  it("refuses empty instruction lists (sandbox keys return none)", () => {
    expect(() => compileForWallet([], wallet, blockhash)).toThrow();
  });
});

describe("inspectPrebuilt", () => {
  const usdc = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const build = (payer: PublicKey, extra: TransactionInstruction[]) =>
    Buffer.from(
      new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: extra }).compileToV0Message()).serialize(),
    ).toString("base64");

  it("accepts compute budget + idempotent ATA create with a single creator signer", () => {
    const payer = Keypair.generate().publicKey;
    const ata = getAssociatedTokenAddressSync(usdc, payer);
    const b64 = build(payer, [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      createAssociatedTokenAccountIdempotentInstruction(payer, ata, payer, usdc),
    ]);
    expect(inspectPrebuilt(b64, payer.toBase58()).transactionB64).toBe(b64);
    expect(() => inspectPrebuilt(b64, Keypair.generate().publicKey.toBase58())).toThrow(/unexpected signer/i);
  });

  it("refuses top-level System or Token transfers", () => {
    const payer = Keypair.generate().publicKey;
    const sys = build(payer, [SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1 })]);
    expect(() => inspectPrebuilt(sys, payer.toBase58())).toThrow(/unexpected program/i);
    const from = getAssociatedTokenAddressSync(usdc, payer);
    const tok = build(payer, [createTransferInstruction(from, Keypair.generate().publicKey, payer, 1)]);
    expect(() => inspectPrebuilt(tok, payer.toBase58())).toThrow(/unexpected program/i);
  });
});
