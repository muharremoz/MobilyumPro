/**
 * Veritabanındaki tablo sayısını basar (tek satır, yalnız sayı).
 *
 * Kurulum betiği (scripts/kurulum.ps1) bununla "boş DB mi, verili DB mi"
 * ayrımını yapar:
 *   • boş   → prisma migrate deploy   (şemayı kurar)
 *   • verili → migrate resolve --applied 0_init  (veriye dokunmaz)
 *
 * Ayrı dosya olmasının sebebi: PowerShell'den `node -e "..."` ile geçirilen
 * JS'te tırnaklar argüman ayrıştırmasında bozuluyordu.
 *
 * Bağlanılamazsa -1 basar ve 0 ile çıkar; çağıran taraf bunu "DB erişilemedi"
 * diye yorumlar. Hata koduyla çıkmıyoruz ki kurulum betiği kendi mesajını
 * verebilsin.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const satir = await db.$queryRawUnsafe(
    "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'",
  );
  console.log(Number(Object.values(satir[0])[0]));
} catch {
  console.log(-1);
} finally {
  await db.$disconnect();
}
