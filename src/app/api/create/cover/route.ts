import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireCreator } from "@/lib/creator";
import { HttpError, json, readJson, route } from "@/lib/http";
import { pantaApi } from "@/lib/panta/client";
import { renderCard } from "@/lib/cards";
import { limit } from "@/lib/rate-limit";

export const maxDuration = 30;

// Generates a 1024×1024 cover (creator avatar + question), uploads it through
// Panta's signed image upload, and returns the public URL Panta requires.
const Body = z.object({ question: z.string().trim().min(10).max(512) });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  await requireCreator(user);
  limit(`upload:${user.id}`, 5, 60_000);
  const { question } = Body.parse(await readJson(req));

  const img = await renderCard("cover", {
    question,
    creatorHandle: user.handle!,
    creatorName: user.displayName,
    avatarUrl: user.avatarUrl,
    kind: "panta",
    yes: null,
    creatorCall: null,
    closesAt: null,
    outcome: null,
    url: "",
    shortUrl: "",
    asOf: Math.floor(Date.now() / 1000),
  });
  const png = await img.arrayBuffer();

  const up = await pantaApi.imageUpload();
  const fd = new FormData();
  for (const [k, v] of Object.entries(up.fields)) fd.append(k, String(v));
  fd.append("file", new Blob([png], { type: "image/png" }), "cover.png");
  const res = await fetch(up.uploadUrl, { method: "POST", body: fd });
  const body = (await res.json().catch(() => null)) as { secure_url?: string } | null;
  if (!res.ok || !body?.secure_url) throw new HttpError(502, "UPLOAD_NOT_CONFIGURED", "The cover upload failed. Try uploading your own image.");
  return json({ imageUrl: body.secure_url });
});
