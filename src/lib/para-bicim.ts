/**
 * Görüntüleme para birimi (`para_birimi` parametresi).
 *
 * Tutarlar veritabanında HER ZAMAN TL tutulur. Bu katman yalnız GÖSTERİMİ
 * çevirir: seçili para birimi TL değilse, TCMB kuruna bölünüp o birimde
 * yazılır.
 *
 * SINIR — çok önemli: yalnız salt okunur gösterimler çevrilir. Para GİRİŞİ
 * yapılan alanlar (paraMaskele/paraMetni kullananlar) TL kalır. Kullanıcının
 * yazdığı sayıyı sessizce çevirmek, kaydedilen veriyi bozardı.
 *
 * Kur olarak TCMB "döviz satış" (forexSatis) kullanılır — TL tutarları başka
 * bir birimde değerlemenin yaygın karşılığı budur. Kur bulunamazsa çevrim
 * YAPILMAZ ve tutar TL olarak gösterilir; yanlış bir kurla değerlemektense
 * olduğu gibi göstermek doğrusu.
 */

export type ParaBicimi = {
  /** TL, USD, EUR... */
  kod: string;
  /** 1 birim yabancı paranın TL karşılığı. TL için 1. */
  kur: number;
  /** Ondalık hane (ondalik_basamak parametresi). */
  basamak: number;
};

export const TL_BICIMI: ParaBicimi = { kod: "TL", kur: 1, basamak: 0 };

const SIMGE: Record<string, string> = {
  TL: "₺",
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CHF: "CHF",
};

/** Para birimi simgesi; tanınmayan kodlarda kodun kendisi kullanılır. */
export function paraSimgesi(kod: string): string {
  return SIMGE[kod.toUpperCase()] ?? kod.toUpperCase();
}

/**
 * TL cinsinden bir tutarı seçili para biriminde biçimler.
 * Kur 0/geçersizse çevrim atlanır (bkz. dosya başı).
 */
export function paraFormatla(tlTutar: number, b: ParaBicimi): string {
  const cevrilebilir = b.kod !== "TL" && Number.isFinite(b.kur) && b.kur > 0;
  const deger = cevrilebilir ? tlTutar / b.kur : tlTutar;
  const kod = cevrilebilir ? b.kod : "TL";

  // Yabancı birimde 0 hane çok kabalaşır (46 TL ≈ 1 $); en az 2 hane.
  const hane = cevrilebilir ? Math.max(b.basamak, 2) : b.basamak;

  return `${paraSimgesi(kod)}${deger.toLocaleString("tr-TR", {
    minimumFractionDigits: hane,
    maximumFractionDigits: hane,
  })}`;
}
