import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { buildCreate } from "@/lib/tx";

const Body = z.object({ intentId: z.string().uuid() });

// Returns Panta's create transaction for the creator's wallet to sign, after
// checking it has exactly one signer (the creator) and only allowed programs.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { intentId } = Body.parse(await readJson(req));
  return json(await buildCreate(user, intentId));
});
