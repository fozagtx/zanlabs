import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireCreator } from "@/lib/creator";
import { json, readJson, route } from "@/lib/http";
import { lintMarket } from "@/lib/lint";

const Body = z.object({
  question: z.string(),
  resolutionRule: z.string(),
  sources: z.array(z.string()).max(25),
  category: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  resolutionTime: z.number(),
  kind: z.enum(["panta", "forecast"]),
});

// Server-side lint (same rules as the live checklist, plus the creator's own
// linked usernames for the "is this about you?" test).
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { usernames } = await requireCreator(user);
  const body = Body.parse(await readJson(req));
  return json(lintMarket({ ...body, creatorUsernames: usernames }));
});
