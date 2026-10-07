import { z } from "zod";
import { assertWallet, requireUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { buildClaim } from "@/lib/tx";

// kind "claim": a fan's winnings (reported to Panta's /trades/ afterwards).
// kind "creator_fee": the creator's accrued fees (never reported to /trades/).
const Body = z.object({
  pantaMarketId: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  wallet: z.string(),
  kind: z.enum(["claim", "creator_fee"]),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const body = Body.parse(await readJson(req));
  await assertWallet(user, body.wallet);
  return json(await buildClaim(user, body.wallet, body.pantaMarketId, body.kind));
});
