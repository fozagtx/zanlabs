import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getLimits, setDailyLimit, setTimeout_ } from "@/lib/eligibility";
import { json, readJson, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  return json(await getLimits(user.id));
});

const Body = z.union([
  z.object({ action: z.literal("daily"), amount: z.number() }),
  z.object({ action: z.literal("timeout"), hours: z.union([z.literal(24), z.literal(168), z.literal(720)]) }),
  z.object({ action: z.literal("exclude"), confirm: z.literal("EXCLUDE") }),
]);

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const body = Body.parse(await readJson(req));
  if (body.action === "daily") return json(await setDailyLimit(user.id, body.amount));
  if (body.action === "timeout") return json(await setTimeout_(user.id, body.hours));
  return json(await setTimeout_(user.id, "forever"));
});
