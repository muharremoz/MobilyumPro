import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Yerel SQL Server'dan tam yedek alır → backups/mobilyumpro_<zaman>.bak
 * Çalıştır: `npm run db:backup`
 * Bağlantı bilgilerini .env'deki DATABASE_URL'den (Prisma sqlserver formatı) okur.
 * sqlcmd'yi PATH'te veya bilinen SQL Server kurulum dizinlerinde arar.
 * Not: BACKUP DATABASE dosyayı SQL Server servisi yazar; sunucu bu makinede
 * (localhost) olmalı ve servis hesabının backups klasörüne yazma izni olmalı.
 */
interface SqlServerConn {
  host: string;
  port?: string;
  database: string;
  user: string;
  password: string;
}

// Prisma sqlserver URL'i: sqlserver://HOST:PORT;key=value;key=value;...
function parseDatabaseUrl(url: string): SqlServerConn {
  const m = url.match(/^sqlserver:\/\/([^;:]+)(?::(\d+))?(;.*)?$/i);
  if (!m) {
    throw new Error(
      "DATABASE_URL sqlserver:// formatında değil (Prisma SQL Server bağlantısı bekleniyor).",
    );
  }
  const [, host, port, rest] = m;
  const params = new Map<string, string>();
  for (const part of (rest ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    let value = part.slice(eq + 1).trim();
    // Prisma özel karakterli değerleri {…} ile sarar.
    if (value.startsWith("{") && value.endsWith("}")) value = value.slice(1, -1);
    params.set(part.slice(0, eq).trim().toLowerCase(), value);
  }
  const database = params.get("database");
  const user = params.get("user");
  const password = params.get("password");
  if (!database || !user || !password) {
    throw new Error("DATABASE_URL içinde database/user/password eksik.");
  }
  return { host, port, database, user, password };
}

function findSqlcmd(): string {
  try {
    execFileSync("sqlcmd", ["-?"], { stdio: "ignore" });
    return "sqlcmd";
  } catch {
    // PATH'te yok — Windows kurulumlarını ara (en yüksek sürüm).
  }
  const candidates: string[] = [];
  for (const programFiles of [
    "C:\\Program Files\\Microsoft SQL Server",
    "C:\\Program Files (x86)\\Microsoft SQL Server",
  ]) {
    if (!existsSync(programFiles)) continue;
    for (const v of readdirSync(programFiles).sort().reverse()) {
      candidates.push(
        join(programFiles, v, "Tools", "Binn", "SQLCMD.EXE"),
        join(programFiles, "Client SDK", "ODBC", v, "Tools", "Binn", "SQLCMD.EXE"),
      );
    }
  }
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error(
    "sqlcmd bulunamadı (PATH veya Microsoft SQL Server kurulum dizinleri). " +
      "Kurulum: https://learn.microsoft.com/sql/tools/sqlcmd-utility",
  );
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL tanımlı değil (.env).");
const conn = parseDatabaseUrl(url);

const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const ts =
  `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
  `_${pad(now.getHours())}${pad(now.getMinutes())}`;

const dir = join(process.cwd(), "backups");
mkdirSync(dir, { recursive: true });
const out = join(dir, `mobilyumpro_${ts}.bak`);

// T-SQL string literal'i için tek tırnakları, tanımlayıcı için köşeli parantezi kaçır.
const outSql = out.replace(/'/g, "''");
const dbIdent = conn.database.replace(/\]/g, "]]");
const backupSql =
  `BACKUP DATABASE [${dbIdent}] TO DISK = N'${outSql}' ` +
  `WITH FORMAT, INIT, NAME = N'${conn.database.replace(/'/g, "''")}_${ts}', STATS = 10`;

const server = conn.port ? `${conn.host},${conn.port}` : conn.host;
const sqlcmd = findSqlcmd();
execFileSync(
  sqlcmd,
  ["-S", server, "-U", conn.user, "-P", conn.password, "-C", "-b", "-Q", backupSql],
  { stdio: "inherit" },
);
console.log(`Yedek yazıldı: ${out}`);
