import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * Tek Postgres bağlantı havuzu (LAN sunucusunda app ile aynı makinede çalışır).
 * Dev'de sıcak yeniden yüklemelerde havuzu tekrar oluşturmamak için global'de tutulur.
 */
const globalForDb = globalThis as unknown as {
  __mobilyumPool?: Pool;
};

const pool =
  globalForDb.__mobilyumPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mobilyumPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
