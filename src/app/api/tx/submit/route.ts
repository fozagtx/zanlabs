import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { submitSigned } from "@/lib/tx";

export const maxDuration = 60;

const Body = z.object({ intentId: z.string().uuid(), signedTransaction: z.string().min(100).max(8000) });

// Broadcast a wallet-signed transaction on our RPC, wait for confirmation,
// then finish the Panta side (submit/verify, register, attribution).
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { intentId, signedTransaction } = Body.parse(await readJson(req));
  return json(await submitSigned(user, intentId, signedTransaction));
});
