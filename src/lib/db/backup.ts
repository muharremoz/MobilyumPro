import "dotenv/config";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { db } from "./index";

/**
 * SQL Server'dan tam yedek alır → backups/mobilyumpro_<zaman>.bak
 * Çalıştır: `npm run db:backup`
 * Not: Dosyayı SQL Server servisi yazar; hedef klasöre servis hesabının
 * yazma izni olmalı (aynı makinede çalıştığı için proje klasörü genelde uygun).
 */
async function backup() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}`;

  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `mobilyumpro_${ts}.bak`);

  await db.$executeRawUnsafe(
    `BACKUP DATABASE [mobilyumpro] TO DISK = N'${out.replace(/'/g, "''")}' WITH INIT, FORMAT, NAME = N'mobilyumpro tam yedek'`,
  );
  console.log(`Yedek yazıldı: ${out}`);
}

backup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Yedekleme hatası:", e);
    process.exit(1);
  });
