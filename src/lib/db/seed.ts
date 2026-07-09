import "dotenv/config";
import { db } from "./index";

/**
 * Boş başlangıç: tüm İŞ verilerini temizler (mock/demo dahil), hiçbir örnek
 * kayıt basmaz. Kullanıcılar, roller, yetkiler, sistem parametreleri ve liste
 * kolon ayarları KORUNUR. `npm run db:seed`.
 */
async function seed() {
  console.log("Temiz başlangıç: iş verileri siliniyor…");

  // FK-güvenli sırada temizle (alt tablolar önce)
  await db.uretimEmriAdim.deleteMany();
  await db.uretimEmri.deleteMany();
  await db.siparis.deleteMany();
  await db.modelParca.deleteMany();
  await db.receteSatiri.deleteMany();
  await db.model.deleteMany();
  await db.parca.deleteMany();
  await db.posetMalzeme.deleteMany();
  await db.poset.deleteMany();
  await db.malzeme.deleteMany();
  await db.musteri.deleteMany();
  await db.depo.deleteMany();
  await db.cariIslem.deleteMany();
  await db.cari.deleteMany();
  await db.stokHareket.deleteMany();

  console.log("Tamam ✓ — sistem boş; veriler uygulama üzerinden girilecek.");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Hata:", e);
    process.exit(1);
  });
