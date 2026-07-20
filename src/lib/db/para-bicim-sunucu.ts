import "server-only";
import { db } from "./index";
import { parametreMetin, parametreSayi } from "./parametre";
import { TL_BICIMI, type ParaBicimi } from "@/lib/para-bicim";

/**
 * `para_birimi` + `ondalik_basamak` parametrelerini ve güncel kuru okur.
 *
 * Kur bulunamazsa (TCMB verisi hiç çekilmemiş, kod tanınmıyor) TL'ye
 * düşülür. Bilinmeyen bir kurla değerleme yapmaktansa tutarı TL olarak
 * göstermek doğrusu — yanlış bir dolar rakamı maliyet kararını bozar.
 */
export async function paraBiciminiOku(): Promise<ParaBicimi> {
  const [kod, basamak] = await Promise.all([
    parametreMetin("para_birimi", "TL"),
    parametreSayi("ondalik_basamak", 2),
  ]);

  const secili = kod.trim().toUpperCase();
  if (!secili || secili === "TL" || secili === "TRY") {
    return { ...TL_BICIMI, basamak };
  }

  try {
    const kur = await db.kur.findUnique({ where: { kod: secili } });
    // birim: bazı para birimleri 100 birim üzerinden kote edilir (JPY gibi).
    const oran =
      kur && Number(kur.forexSatis) > 0
        ? Number(kur.forexSatis) / (kur.birim || 1)
        : 0;
    if (!oran) return { ...TL_BICIMI, basamak };
    return { kod: secili, kur: oran, basamak };
  } catch {
    return { ...TL_BICIMI, basamak };
  }
}
