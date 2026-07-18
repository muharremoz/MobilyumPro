import "server-only";

import { db } from "./index";

/**
 * Kod sayacı — SH-#### gibi seri numaraları çakışmasız üretir.
 *
 * Neden tablo: numaralar "tüm id'leri tara, max+1" ile üretiliyordu. İki
 * eşzamanlı yazar aynı max'ı okuyup aynı numarayı üretiyor, ikincisi birincil
 * anahtar ihlaliyle patlıyordu. Ölçüm: 5 paralel yazarda 3 kez yeniden deneme
 * bile yetmedi, 1 yazar başarısız oldu.
 *
 * Buradaki tek satırlık UPDATE ... OUTPUT satır kilidi aldığı için yazarları
 * sıraya sokar; çakışma mümkün değil. Taramayı da kaldırdığı için hareket
 * sayısı büyüdükçe yavaşlamaz.
 *
 * ÖNEMLİ: bir seri için TEK kaynak olmalı. Aynı ön eki hem sayaçtan hem
 * max-tarayarak üreten iki yol kalırsa numaralar tekrar çakışır.
 */

export type TxIstemci = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Prisma benzersizlik ihlali (P2002). */
function benzersizlikIhlali(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "P2002"
  );
}

/**
 * Sayaç satırını garantiye alır — TRANSACTION DIŞINDA çağrılmalı.
 *
 * Tohumlama transaction'ın içinde yapılınca, satır henüz yokken başlayan tüm
 * eşzamanlı yazarlar aynı satırı oluşturmaya kalkıyor ve biri hariç hepsi
 * ihlal alıyordu (ölçüm: 10 yazardan 9'u başarısız). Dışarıda yapılınca
 * yarışı kaybeden taraf yalnızca "zaten var" bilgisini yutar, transaction'ı
 * hiç açmadan devam eder.
 */
export async function sayacHazirla(
  ad: string,
  tabanBul: () => Promise<number>,
): Promise<void> {
  const varMi = await db.sayac.findUnique({ where: { ad }, select: { ad: true } });
  if (varMi) return;
  try {
    // Mevcut kayıtların ÜSTÜNDEN başla; yoksa sayaç eski numaraları yeniden
    // üretir ve elde duran kayıtlarla çakışır.
    await db.sayac.create({ data: { ad, deger: await tabanBul() } });
  } catch (e) {
    // Aynı anda başkası oluşturduysa sorun değil; satır artık var.
    if (!benzersizlikIhlali(e)) throw e;
  }
}

/**
 * Sıradaki numarayı atomik olarak alır ve sayacı ilerletir.
 *
 * Satır varsayılır — önce `sayacHazirla` çağrılmış olmalı. Transaction
 * istemcisiyle çağrılır ki numara ile kaydın yazımı aynı transaction'da olsun;
 * ayrı olsalardı transaction geri alındığında numara iki kez kullanılabilirdi.
 */
export async function sonrakiNo(tx: TxIstemci, ad: string): Promise<number> {
  const sonuc = await tx.$queryRawUnsafe<{ deger: number }[]>(
    `UPDATE sayac SET deger = deger + 1 OUTPUT INSERTED.deger AS deger WHERE ad = @P1`,
    ad,
  );
  if (!sonuc.length) {
    throw new Error(
      `Sayaç bulunamadı: ${ad}. Transaction'dan önce sayacHazirla çağrılmalı.`,
    );
  }
  return sonuc[0].deger;
}
