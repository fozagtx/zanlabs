import { setupStatus } from "@/lib/env";
import { json, route } from "@/lib/http";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

// Configuration status (no secrets) so the UI can explain what isn't set up.
export const GET = route(async () => {
  let db = "ok";
  try {
    const d = await getDb();
    await d.execute(sql`select 1`);
  } catch (e) {
    db = `error: ${(e as Error).message.slice(0, 120)}`;
  }
  return json({ ...setupStatus(), db });
});
