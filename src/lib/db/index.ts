import "server-only";
import path from "node:path";
import fs from "node:fs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { env } from "../env";
import * as schema from "./schema";

// One database handle per server process. With DATABASE_URL set we use
// postgres-js (Supabase, Neon, any Postgres). Without it we fall back to an
// embedded PGlite database in .data/pglite so the app runs locally with zero
// setup. Migrations in ./drizzle are applied once on first access.

export type DB = PostgresJsDatabase<typeof schema>;

type Holder = { db?: Promise<DB> };
const g = globalThis as unknown as { __zanDb?: Holder };
const holder: Holder = (g.__zanDb ??= {});

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function init(): Promise<DB> {
  const url = env.databaseUrl();
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { max: 5, prepare: false });
    const db = drizzle(client, { schema });
    if (env.autoMigrate()) {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: MIGRATIONS });
    }
    return db;
  }
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!holder.db) {
    holder.db = init().catch((e) => {
      holder.db = undefined;
      throw e;
    });
  }
  return holder.db;
}

export { schema };
