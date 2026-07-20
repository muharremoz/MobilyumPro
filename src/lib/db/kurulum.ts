import "server-only";
import { db } from "./index";
import { parametreSayi } from "./parametre";
import { sifreHashle } from "./sifre";

/**
 * İlk kurulum (bootstrap) — sıfır veritabanında ilk yöneticiyi doğurur.
 *
 * Neden var: `prisma migrate deploy` şemayı kurar ama tek bir kullanıcı bile
 * basmaz (seed de basmaz — bilinçli, müşteri DB'sine sahte veri girmiyoruz).
 * Kullanıcı yokken /login listesi boş kalır ve panele girilemez; yani kurulum
 * kendini kilitler. Bu dosya o kilidi açan tek kapıdır.
 *
 * GÜVENLİK: kapı yalnız "hiç kullanıcı yokken" açıktır. Tek kullanıcı
 * oluştuğu anda hem sayfa hem action kalıcı olarak kapanır — aksi halde
 * herkesin kendine yönetici açabildiği bir uç nokta bırakmış olurduk.
 *
 * Sihirbazın hangi adımda olduğu `lib/kurulum/kurulum-islem.ts` içindeki
 * `kurulumAdimi()` ile belirlenir; buradaki denetim onun altındaki son
 * emniyet kilididir.
 */

/** Kurulumda açılan roller — yetki matrisi boş bir listeyle açılmasın diye. */
const VARSAYILAN_ROLLER = ["Yönetici", "Kullanıcı", "Görüntüleyici"];

export type IlkKurulumGirdi = {
  firmaAdi: string;
  adSoyad: string;
  kullaniciAdi: string;
  sifre: string;
};

export async function ilkKurulum(
  g: IlkKurulumGirdi,
): Promise<{ ok: boolean; error?: string; kullaniciAdi?: string }> {
  const firmaAdi = g.firmaAdi.trim();
  const adSoyad = g.adSoyad.trim();
  const kullaniciAdi = g.kullaniciAdi.trim().toLowerCase();

  if (!adSoyad) return { ok: false, error: "Ad soyad zorunludur." };
  if (!/^[a-z0-9._-]{3,}$/.test(kullaniciAdi))
    return {
      ok: false,
      error:
        "Kullanıcı adı en az 3 karakter olmalı; yalnız harf, rakam, nokta, alt çizgi ve tire.",
    };
  // İlk kurulumda parametre henüz DB'de yok; tanımlı varsayılana düşer.
  const enAz = await parametreSayi("sifre_min_uzunluk", 8);
  if (g.sifre.length < enAz)
    return { ok: false, error: `Şifre en az ${enAz} karakter olmalıdır.` };

  try {
    // Serializable: iki istek aynı anda gelirse ikisi de "kullanıcı yok"
    // görüp iki yönetici açmasın. Kurulum tek seferlik olmalı.
    await db.$transaction(
      async (tx) => {
        if ((await tx.kullanici.count()) > 0) {
          throw new Error("KURULUM_TAMAMLANMIS");
        }

        for (const ad of VARSAYILAN_ROLLER) {
          await tx.rol.upsert({ where: { ad }, update: {}, create: { ad } });
        }

        await tx.kullanici.create({
          data: {
            id: "USR-1001",
            kullaniciAdi,
            adSoyad,
            sifreHash: sifreHashle(g.sifre),
            rol: "Yönetici",
            durum: "Aktif",
            olusturma: new Date(new Date().toISOString().slice(0, 10)),
          },
        });

        if (firmaAdi) {
          await tx.sistemParametre.upsert({
            where: { anahtar: "firma_adi" },
            update: { deger: firmaAdi },
            create: { anahtar: "firma_adi", deger: firmaAdi },
          });
        }
      },
      { isolationLevel: "Serializable" },
    );

    return { ok: true, kullaniciAdi };
  } catch (e) {
    if ((e as Error)?.message === "KURULUM_TAMAMLANMIS")
      return { ok: false, error: "Kurulum zaten tamamlanmış." };
    return { ok: false, error: "Kurulum kaydedilemedi. Veritabanını denetleyin." };
  }
}
