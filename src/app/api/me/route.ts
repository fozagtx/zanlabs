import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { isValidHandle, normalizeHandle } from "@/lib/ids";
import { meView } from "@/lib/me";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  return json(await meView(user, req.headers));
});

const Patch = z.object({
  handle: z.string().optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
  bio: z.string().trim().max(160).optional(),
  activeWallet: z.string().optional(),
});

export const PATCH = route(async (req: Request) => {
  const user = await requireUser(req);
  const body = Patch.parse(await readJson(req));
  const db = await getDb();
  const patch: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() };
  if (body.handle !== undefined) {
    const h = normalizeHandle(body.handle);
    if (!isValidHandle(h)) throw new HttpError(400, "BAD_REQUEST", "Handles are 3–20 characters: letters, numbers and underscores.");
    const taken = await db.query.users.findFirst({ where: eq(schema.users.handle, h) });
    if (taken && taken.id !== user.id) throw new HttpError(409, "BAD_REQUEST", "That handle is taken.");
    patch.handle = h;
  }
  if (body.displayName !== undefined) patch.displayName = body.displayName;
  if (body.bio !== undefined) patch.bio = body.bio;
  if (body.activeWallet !== undefined) {
    const w = await db.query.wallets.findFirst({ where: eq(schema.wallets.address, body.activeWallet) });
    if (!w || w.userId !== user.id) throw new HttpError(403, "WALLET_NOT_OWNED");
    patch.activeWallet = body.activeWallet;
  }
  const [updated] = await db.update(schema.users).set(patch).where(eq(schema.users.id, user.id)).returning();
  return json(await meView(updated, req.headers));
});
