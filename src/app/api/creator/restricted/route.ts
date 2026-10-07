import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { PublicKey } from "@solana/web3.js";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { meView } from "@/lib/me";

// Team, manager and family wallets declared by a creator. They are blocked
// from trading the creator's markets in-app and monitored on Panta.

const Add = z.object({ wallet: z.string(), relation: z.string().trim().min(1).max(40) });
const Remove = z.object({ wallet: z.string() });

async function creatorOnly(req: Request) {
  const user = await requireUser(req);
  if (user.role !== "creator") throw new HttpError(403, "NOT_CREATOR");
  return user;
}

export const POST = route(async (req: Request) => {
  const user = await creatorOnly(req);
  const body = Add.parse(await readJson(req));
  try {
    new PublicKey(body.wallet);
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "That isn't a valid Solana address.");
  }
  const db = await getDb();
  await db
    .insert(schema.restrictedTraders)
    .values({ creatorId: user.id, wallet: body.wallet, relation: body.relation })
    .onConflictDoNothing();
  return json(await meView(user, req.headers));
});

// Removing a wallet is allowed only 7 days after it was declared, so a team
// member can't be unlisted right before a market they'd like to trade.
export const DELETE = route(async (req: Request) => {
  const user = await creatorOnly(req);
  const body = Remove.parse(await readJson(req));
  const db = await getDb();
  const row = await db.query.restrictedTraders.findFirst({
    where: and(eq(schema.restrictedTraders.creatorId, user.id), eq(schema.restrictedTraders.wallet, body.wallet)),
  });
  if (!row) throw new HttpError(404, "NOT_FOUND");
  if (Date.now() - row.createdAt.getTime() < 7 * 86400_000) {
    throw new HttpError(409, "BAD_REQUEST", "Restricted wallets can be removed 7 days after they were added.");
  }
  await db
    .delete(schema.restrictedTraders)
    .where(and(eq(schema.restrictedTraders.creatorId, user.id), eq(schema.restrictedTraders.wallet, body.wallet)));
  return json(await meView(user, req.headers));
});
