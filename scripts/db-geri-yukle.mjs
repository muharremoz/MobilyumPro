/**
 * prisma/veri/snapshot.json'daki veriyi DB'ye yükler.
 * Kullanım: npm run db:geri-yukle
 *
 * DİKKAT: Snapshot'taki tabloların MEVCUT İÇERİĞİNİ SİLER, sonra yükler
 * (birleştirme yapmaz — iki makinede aynı veri olsun diye). Şema önce
 * güncel olmalı: `npx prisma db push`.
 *
 * SQL Server notu: IDENTITY id'li tablolara açık id yazmak için
 * SET IDENTITY_INSERT gerekir ve bu ayar YALNIZ aynı batch'te geçerlidir
 * (Prisma her sorguyu ayrı sp_executesql batch'inde çalıştırır). Bu yüzden
 * o tablolarda "SET ON; INSERT; SET OFF" tek ham batch olarak gönderilir.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import {
  TABLO_SIRASI,
  KENDINE_REFERANS,
  IDENTITY_TABLOLAR,
} from "./db-tablolar.mjs";

const db = new PrismaClient();
const kaynak = path.join("prisma", "veri", "snapshot.json");

if (!fs.existsSync(kaynak)) {
  console.error(`Snapshot yok: ${kaynak}`);
  process.exit(1);
}
const veri = JSON.parse(fs.readFileSync(kaynak, "utf8"));

// Model adı → alan listesi (DB kolon adı + tipi) — ham INSERT için.
const modelBilgi = new Map(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name[0].toLowerCase() + m.name.slice(1),
    m.fields.filter((f) => f.kind === "scalar"),
  ]),
);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
/** JSON değerini Prisma'nın beklediği tipe çevirir. */
const deger = (v, tip) => {
  if (v === null || v === undefined) return null;
  if (tip === "DateTime") return new Date(v);
  if (tip === "Decimal" || tip === "Float") return Number(v);
  return v;
};
/** Prisma create() için satırı düzeltir (tarih string → Date). */
const duzelt = (satir) =>
  Object.fromEntries(
    Object.entries(satir).map(([k, v]) => [
      k,
      typeof v === "string" && ISO.test(v) ? new Date(v) : v,
    ]),
  );

/** Kendine referans veren tabloda üst kayıtlar önce yazılmalı (FK). */
function hiyerarsikSirala(satirlar, alan) {
  const kalan = [...satirlar];
  const yazilan = new Set();
  const sonuc = [];
  while (kalan.length) {
    const hazir = kalan.filter((r) => !r[alan] || yazilan.has(r[alan]));
    // Kırık referans varsa (üstü snapshot'ta yok) sonsuz döngüye girme.
    if (hazir.length === 0) {
      sonuc.push(...kalan);
      break;
    }
    for (const r of hazir) {
      sonuc.push(r);
      yazilan.add(r.id);
      kalan.splice(kalan.indexOf(r), 1);
    }
  }
  return sonuc;
}

/** IDENTITY tablosuna id'leri koruyarak tek batch'te yazar. */
async function identityYaz(model, dbTablo, satirlar) {
  const alanlar = modelBilgi.get(model);
  for (const satir of satirlar) {
    const kullanilan = alanlar.filter((f) => satir[f.name] !== undefined);
    const kolonlar = kullanilan
      .map((f) => `[${f.dbName ?? f.name}]`)
      .join(", ");
    const yerler = kullanilan.map((_, i) => `@P${i + 1}`).join(", ");
    const degerler = kullanilan.map((f) => deger(satir[f.name], f.type));
    await db.$executeRawUnsafe(
      `SET IDENTITY_INSERT [${dbTablo}] ON; ` +
        `INSERT INTO [${dbTablo}] (${kolonlar}) VALUES (${yerler}); ` +
        `SET IDENTITY_INSERT [${dbTablo}] OFF;`,
      ...degerler,
    );
  }
}

// 1) Temizle — çocuktan ebeveyne (FK).
for (const tablo of [...TABLO_SIRASI].reverse()) {
  const model = db[tablo];
  if (!model || !veri[tablo]) continue;
  await model.deleteMany({});
}

// 2) Yükle — ebeveynden çocuğa.
let toplam = 0;
for (const tablo of TABLO_SIRASI) {
  const model = db[tablo];
  const satirlar = veri[tablo];
  if (!model || !satirlar?.length) continue;
  const sirali = KENDINE_REFERANS[tablo]
    ? hiyerarsikSirala(satirlar, KENDINE_REFERANS[tablo])
    : satirlar;
  const dbTablo = IDENTITY_TABLOLAR[tablo];
  if (dbTablo) await identityYaz(tablo, dbTablo, sirali);
  else for (const satir of sirali) await model.create({ data: duzelt(satir) });
  toplam += sirali.length;
}

console.log(`Geri yüklendi ← ${kaynak}`);
console.log(`${toplam} kayıt`);
await db.$disconnect();
