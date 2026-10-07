import { z } from "zod";
import { assertWallet, requireUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { buildWithdraw } from "@/lib/tx";

// Send USDC from the user's wallet to any Solana address (an exchange deposit
// address or a local off-ramp). The user signs; we broadcast.
const Body = z.object({ wallet: z.string(), to: z.string().min(32).max(44), amount: z.number().positive().max(100_000) });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const body = Body.parse(await readJson(req));
  await assertWallet(user, body.wallet);
  return json(await buildWithdraw(user, body.wallet, body.to, body.amount));
});
