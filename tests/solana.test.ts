import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
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
  it("accepts a single-signer transaction using allowed programs and rejects others", () => {
    const payer = Keypair.generate().publicKey;
    const msg = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions: [SystemProgram.transfer({ fromPubkey: payer, toPubkey: new PublicKey(PANTA), lamports: 1 })],
    }).compileToV0Message();
    const b64 = Buffer.from(new VersionedTransaction(msg).serialize()).toString("base64");
    expect(inspectPrebuilt(b64, payer.toBase58()).messageB64).toBe(Buffer.from(msg.serialize()).toString("base64"));
    expect(() => inspectPrebuilt(b64, Keypair.generate().publicKey.toBase58())).toThrow(/unexpected signer/i);
  });
});
