import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { buildBuy } from "@/lib/tx";

const Body = z.object({ intentId: z.string().uuid() });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { intentId } = Body.parse(await readJson(req));
  return json(await buildBuy(user, intentId));
});
