/**
 * DB anlık görüntüsünü prisma/veri/snapshot.json'a yazar (git'e girer).
 * Kullanım: npm run db:yedek
 *
 * Amaç: ev ↔ ofis arasında veriyi git üzerinden taşımak. Şema değişikliği
 * ayrıca `prisma db push` ile gider; bu dosya yalnız SATIRLARI taşır.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import { TABLO_SIRASI } from "./db-tablolar.mjs";

const db = new PrismaClient();
const hedef = path.join("prisma", "veri", "snapshot.json");

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

fs.mkdirSync(path.dirname(hedef), { recursive: true });
// Decimal/Date → JSON: Prisma Decimal'i toJSON ile string'e döner; Date ISO olur.
fs.writeFileSync(hedef, JSON.stringify(veri, null, 2) + "\n", "utf8");

const dolu = Object.entries(veri)
  .filter(([, v]) => v.length > 0)
  .map(([k, v]) => `${k}:${v.length}`);
console.log(`Yedek alındı → ${hedef}`);
console.log(`${toplam} kayıt · ${dolu.join(" ")}`);
await db.$disconnect();
