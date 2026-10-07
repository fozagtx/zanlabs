import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { countryFromHeaders } from "@/lib/geo";
import { meView } from "@/lib/me";

// First real-money pick: the fan confirms they are 18+. Country comes from
// the network edge, not from what the user types.
const Body = z.object({ over18: z.literal(true) });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  Body.parse(await readJson(req));
  const country = countryFromHeaders(req.headers);
  if (!country) throw new HttpError(403, "REGION_BLOCKED", "We couldn't determine your region, so real-money picks stay off.");
  const db = await getDb();
  const [updated] = await db
    .update(schema.users)
    .set({ ageAttestedAt: new Date(), countryCode: country, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id))
    .returning();
  return json(await meView(updated, req.headers));
});
