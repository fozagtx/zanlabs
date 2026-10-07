import { requireUser, syncFromPrivy } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { meView } from "@/lib/me";

// Called by the client after login and whenever its wallet list changes.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const synced = await syncFromPrivy(user);
  return json(await meView(synced, req.headers));
});
