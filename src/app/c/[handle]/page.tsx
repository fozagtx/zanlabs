import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { toViews } from "@/lib/markets";
import { creatorRecord } from "@/lib/creator";
import { Storefront } from "@/components/storefront";

type Props = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.handle, handle.toLowerCase()) });
  if (!user || user.role !== "creator") return null;
  const socials = await db.select().from(schema.socialAccounts).where(eq(schema.socialAccounts.userId, user.id));
  const rows = await db
    .select()
    .from(schema.markets)
    .where(and(eq(schema.markets.creatorId, user.id), ne(schema.markets.status, "draft")))
    .orderBy(desc(schema.markets.createdAt))
    .limit(60);
  const [markets, record] = await Promise.all([toViews(rows), creatorRecord(user.id)]);
  return {
    creator: {
      handle: user.handle!,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      socials: socials.map((x) => ({ provider: x.provider, username: x.username })),
    },
    markets,
    record,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const d = await load(handle);
  if (!d) return { title: "Creator not found" };
  return {
    title: `@${d.creator.handle}'s calls`,
    description: d.creator.bio ?? `Back or fade @${d.creator.handle}'s calls.`,
    openGraph: d.markets[0] ? { images: [`/api/card/${d.markets[0].slug}?f=og`] } : undefined,
  };
}

// Creator link page: the one link a creator puts in every bio, listing their markets.
export default async function CreatorPage({ params }: Props) {
  const { handle } = await params;
  const d = await load(handle);
  if (!d) notFound();
  return <Storefront {...d} />;
}
