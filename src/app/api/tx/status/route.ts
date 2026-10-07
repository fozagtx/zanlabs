import { requireUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { resume } from "@/lib/tx";

export const maxDuration = 60;

// Resume a transaction whose confirmation outlived the submit request.
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const intentId = new URL(req.url).searchParams.get("intentId");
  if (!intentId) throw new HttpError(400, "BAD_REQUEST", "intentId is required.");
  return json(await resume(user, intentId));
});
