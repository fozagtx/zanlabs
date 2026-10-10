import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { UserRow } from "./auth";
import type { MeView } from "./types";
import { countryFromHeaders, realMoneyAllowed } from "./geo";

export async function meView(user: UserRow, headers: Headers): Promise<MeView> {
  const db = await getDb();
  const [wallets, socials, creator, restricted] = await Promise.all([
    db.select().from(schema.wallets).where(eq(schema.wallets.userId, user.id)),
    db.select().from(schema.socialAccounts).where(eq(schema.socialAccounts.userId, user.id)),
    db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, user.id) }),
    db.select().from(schema.restrictedTraders).where(eq(schema.restrictedTraders.creatorId, user.id)),
  ]);
  const detected = countryFromHeaders(headers);
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    refCode: user.refCode,
    role: user.role,
    countryCode: user.countryCode,
    detectedCountry: detected,
    realMoneyRegion: realMoneyAllowed(detected),
    ageAttested: Boolean(user.ageAttestedAt),
    activeWallet: user.activeWallet,
    wallets: wallets.map((w) => ({ address: w.address, kind: w.kind })),
    socials: socials.map((s) => ({ provider: s.provider, username: s.username })),
    creator: creator
      ? {
          createWallet: creator.createWallet,
          jurisdiction: creator.jurisdiction,
          realMoneyEnabled: creator.realMoneyEnabled,
          restricted: restricted.map((r) => ({ wallet: r.wallet, relation: r.relation })),
        }
      : null,
  };
}
