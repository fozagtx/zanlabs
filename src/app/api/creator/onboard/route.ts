import { z } from "zod";
import { eq } from "drizzle-orm";
import { PublicKey } from "@solana/web3.js";
import { assertWallet, requireUser, syncFromPrivy } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { countryFromHeaders, realMoneyAllowed } from "@/lib/geo";
import { isValidHandle, normalizeHandle } from "@/lib/ids";
import { meView } from "@/lib/me";

const Body = z.object({
  handle: z.string(),
  displayName: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(160).optional(),
  createWallet: z.string(),
  over18: z.literal(true),
  audienceAdult: z.literal(true),
  disclosure: z.literal(true),
  restricted: z
    .array(z.object({ wallet: z.string(), relation: z.string().trim().min(1).max(40) }))
    .max(25)
    .default([]),
});

export const POST = route(async (req: Request) => {
  let user = await requireUser(req);
  user = await syncFromPrivy(user);
  const body = Body.parse(await readJson(req));
  const handle = normalizeHandle(body.handle);
  if (!isValidHandle(handle)) throw new HttpError(400, "BAD_REQUEST", "Handles are 3–20 characters: letters, numbers and underscores.");
  await assertWallet(user, body.createWallet);
  for (const r of body.restricted) {
    try {
      new PublicKey(r.wallet);
    } catch {
      throw new HttpError(400, "BAD_REQUEST", `"${r.wallet}" isn't a valid Solana address.`);
    }
  }

  const db = await getDb();
  const taken = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  if (taken && taken.id !== user.id) throw new HttpError(409, "BAD_REQUEST", "That handle is taken.");

  const country = countryFromHeaders(req.headers);
  const now = new Date();
  const [updated] = await db
    .update(schema.users)
    .set({
      handle,
      displayName: body.displayName,
      bio: body.bio ?? null,
      role: "creator",
      ageAttestedAt: user.ageAttestedAt ?? now,
      countryCode: country,
      updatedAt: now,
    })
    .where(eq(schema.users.id, user.id))
    .returning();

  await db
    .insert(schema.creatorProfiles)
    .values({
      userId: user.id,
      createWallet: body.createWallet,
      jurisdiction: country ?? "??",
      audienceAdultAttestedAt: now,
      disclosureAcceptedAt: now,
      realMoneyEnabled: realMoneyAllowed(country),
    })
    .onConflictDoUpdate({
      target: schema.creatorProfiles.userId,
      set: { createWallet: body.createWallet, jurisdiction: country ?? "??", realMoneyEnabled: realMoneyAllowed(country) },
    });

  for (const r of body.restricted) {
    await db
      .insert(schema.restrictedTraders)
      .values({ creatorId: user.id, wallet: r.wallet, relation: r.relation })
      .onConflictDoNothing();
  }
  return json(await meView(updated, req.headers));
});
