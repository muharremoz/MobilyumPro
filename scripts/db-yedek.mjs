/**
 * DB anlık görüntüsünü prisma/veri/snapshot.json'a yazar (git'e girer).
 * Kullanım: npm run db:yedek   (veya: npm run db:yedek -- --zorla)
 *
 * Amaç: ev ↔ ofis arasında veriyi git üzerinden taşımak. Şema değişikliği
 * ayrıca `prisma db push` ile gider; bu dosya yalnız SATIRLARI taşır.
 *
 * BOŞALTMA KORUMASI: Snapshot'ta dolu olan bir tablo DB'de boşsa yedek
 * ALINMAZ. Sebep, gerçekten yaşanmış bir kayıp: `db:geri-yukle` çalıştırmadan
 * `db:yedek` alınırsa, diğer makinenin verisi sessizce snapshot'tan düşer ve
 * kayıp git üzerinden karşı tarafa taşınır (bkz. f37f9da — bir özellik
 * commit'i, mesajında veriden söz etmiyor, LOREN üretim zincirini silmişti).
 * Boşaltma kasıtlıysa: `npm run db:yedek -- --zorla`.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import { TABLO_SIRASI } from "./db-tablolar.mjs";

const db = new PrismaClient();
const hedef = path.join("prisma", "veri", "snapshot.json");
const zorla = process.argv.includes("--zorla");

const veri = {};
let toplam = 0;
for (const tablo of TABLO_SIRASI) {
  const model = db[tablo];
  if (!model) {
    console.warn(`! ${tablo}: Prisma modeli yok, atlandı`);
    continue;
  }
  const satirlar = await model.findMany();
  veri[tablo] = satirlar;
  toplam += satirlar.length;
}

// ── Boşaltma koruması ───────────────────────────────────────────────────
// Yalnız "snapshot'ta dolu → DB'de boş" hâlini engeller. Satır sayısındaki
// azalma normaldir (kayıt silmiş olabilirsin); tablonun tamamen boşalması
// neredeyse her zaman "geri yüklemeyi unuttum" demektir.
if (fs.existsSync(hedef)) {
  let eski;
  try {
    eski = JSON.parse(fs.readFileSync(hedef, "utf8"));
  } catch {
    eski = null; // Bozuk/okunamayan snapshot koruma yapmaz, üstüne yazılır.
  }
  if (eski) {
    const bosalan = Object.keys(veri)
      .filter((t) => (eski[t]?.length ?? 0) > 0 && veri[t].length === 0)
      .map((t) => ({ tablo: t, eski: eski[t].length }));

    if (bosalan.length > 0) {
      const satir = bosalan
        .map((b) => `    ${b.tablo}: snapshot ${b.eski} → DB 0`)
        .join("\n");
      const mesaj =
        `Snapshot'ta dolu olan ${bosalan.length} tablo DB'de boş:\n${satir}`;

      if (!zorla) {
        console.error(`\n✋ Yedek ALINMADI — ${mesaj}\n`);
        console.error("  Büyük olasılıkla `npm run db:geri-yukle` çalıştırmayı");
        console.error("  unuttun. Şimdi yedek alırsan bu veri snapshot'tan");
        console.error("  düşer ve kayıp git ile diğer makineye taşınır.\n");
        console.error("  Devir akışı:  git pull → npx prisma db push →");
        console.error("                npm run db:geri-yukle\n");
        console.error("  Boşaltma kasıtlıysa:  npm run db:yedek -- --zorla\n");
        await db.$disconnect();
        process.exit(1);
      }
      console.warn(`\n⚠ --zorla ile geçildi — ${mesaj}\n`);
    }
  }
}

fs.mkdirSync(path.dirname(hedef), { recursive: true });
// Decimal/Date → JSON: Prisma Decimal'i toJSON ile string'e döner; Date ISO olur.
fs.writeFileSync(hedef, JSON.stringify(veri, null, 2) + "\n", "utf8");

const dolu = Object.entries(veri)
  .filter(([, v]) => v.length > 0)
  .map(([k, v]) => `${k}:${v.length}`);
console.log(`Yedek alındı → ${hedef}`);
console.log(`${toplam} kayıt · ${dolu.join(" ")}`);
await db.$disconnect();
