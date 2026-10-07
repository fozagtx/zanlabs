import { assertWallet, requireUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { balances } from "@/lib/solana/server";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const address = new URL(req.url).searchParams.get("address");
  if (!address) throw new HttpError(400, "BAD_REQUEST", "address is required.");
  await assertWallet(user, address);
  try {
    return json(await balances(address));
  } catch {
    throw new HttpError(502, "BAD_REQUEST", "Couldn't read balances from Solana right now.");
  }
});
