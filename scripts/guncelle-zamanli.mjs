/**
 * Gece otomatik güncelleme kapısı. Windows Zamanlanmış Görevi bunu her gece
 * çağırır (örn. 02:00). Yalnızca güncelleme modu "otomatik" ise gerçek
 * güncelleyiciyi (guncelle.mjs) çalıştırır; "elle" veya "kapali" ise dokunmaz.
 *
 * Neden ayrı dosya: guncelle.mjs saf mekanizmadır (DB bilmez). Mod kararı
 * burada, DB'deki `guncelleme_mod` parametresine bakılarak verilir.
 *
 * Mod DB'den okunamazsa (DB kapalı vb.) GÜVENLİ tarafta kalınır: güncelleme
 * YAPILMAZ. Bilinmeyen durumda kendiliğinden kurulum yapmak istemeyiz.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

let mod = "elle"; // güvenli varsayılan
try {
  const row = await db.sistemParametre.findUnique({
    where: { anahtar: "guncelleme_mod" },
  });
  if (row?.deger) mod = row.deger;
} catch (e) {
  console.error(`Mod okunamadı (${e.message}) — güvenlik için güncelleme atlanıyor.`);
  await db.$disconnect();
  process.exit(0);
}
await db.$disconnect();

if (mod !== "otomatik") {
  console.log(`Güncelleme modu "${mod}" — gece otomatik güncelleme atlandı.`);
  process.exit(0);
}

console.log("Güncelleme modu otomatik — güncelleyici çalıştırılıyor...");
try {
  execSync("node scripts/guncelle.mjs", { stdio: "inherit" });
} catch {
  // guncelle.mjs kendi hata/rollback'ini yönetir ve uygun çıkış kodu verir.
  process.exit(1);
}
