import { requireUser } from "@/lib/auth";
import { requireCreator } from "@/lib/creator";
import { json, route } from "@/lib/http";
import { pantaApi } from "@/lib/panta/client";
import { limit } from "@/lib/rate-limit";

// Signed upload fields from Panta. The browser uploads the image straight to
// Panta's image host and passes the returned secure_url as imageUrl.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  await requireCreator(user);
  limit(`upload:${user.id}`, 5, 60_000);
  const up = await pantaApi.imageUpload();
  return json({ uploadUrl: up.uploadUrl, fields: up.fields, expiresAt: up.expiresAt ?? null });
});
