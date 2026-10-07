import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireCreator } from "@/lib/creator";
import { json, readJson, route } from "@/lib/http";
import { draftMarket } from "@/lib/llm";
import { limit } from "@/lib/rate-limit";

export const maxDuration = 30;

const Body = z.object({ hotTake: z.string().trim().min(8).max(600), timezone: z.string().max(64).default("UTC") });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  await requireCreator(user);
  limit(`draft:${user.id}`, 10, 60_000);
  const { hotTake, timezone } = Body.parse(await readJson(req));
  return json(await draftMarket(hotTake, new Date().toISOString(), timezone));
});
