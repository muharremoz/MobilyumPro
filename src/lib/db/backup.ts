import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Yerel Postgres'ten SQL yedeği alır → backups/mobilyumpro_<zaman>.sql
 * Çalıştır: `npm run db:backup`
 * pg_dump'ı PATH'te veya "C:\Program Files\PostgreSQL\*\bin" altında arar.
 */
function findPgDump(): string {
  try {
    execFileSync("pg_dump", ["--version"], { stdio: "ignore" });
    return "pg_dump";
  } catch {
    // PATH'te yok — Windows kurulumunu ara (en yüksek sürüm).
  }
  const base = "C:\\Program Files\\PostgreSQL";
  if (existsSync(base)) {
    for (const v of readdirSync(base).sort().reverse()) {
      const p = join(base, v, "bin", "pg_dump.exe");
      if (existsSync(p)) return p;
    }
  }
  throw new Error(
    "pg_dump bulunamadı (PATH veya C:\\Program Files\\PostgreSQL\\*\\bin).",
  );
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL tanımlı değil (.env).");

const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const ts =
  `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
  `_${pad(now.getHours())}${pad(now.getMinutes())}`;

const dir = join(process.cwd(), "backups");
mkdirSync(dir, { recursive: true });
const out = join(dir, `mobilyumpro_${ts}.sql`);

const pgDump = findPgDump();
execFileSync(pgDump, ["--no-owner", "--no-privileges", "-f", out, url], {
  stdio: "inherit",
});
console.log(`Yedek yazıldı: ${out}`);
