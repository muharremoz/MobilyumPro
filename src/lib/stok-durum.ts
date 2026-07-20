/**
 * PROJE STANDARDI — stok yeterlilik durumu.
 *
 * Eşik üç ayrı yerde birbirinden bağımsız tanımlıydı: pano `minStok`'a
 * bakıyor, stok durumu ekranı ve özet ise sabit 5 kullanıyordu. Aynı ürün
 * panoda "kritik", stok durumunda "yeterli" görünebiliyordu. Tek kaynak burası.
 */

/**
 * Kartta minStok tanımlı değilse ve parametre de okunamıyorsa kullanılan eşik.
 * Asıl kaynak `kritik_stok_esigi` sistem parametresidir; bu yalnız son çaredir.
 */
export const KRITIK_VARSAYILAN = 5;

export type StokDurum = "tukendi" | "kritik" | "yeterli";

/**
 * Kartın durumu. Eşik sırası: kartın kendi `minStok`'u → `kritik_stok_esigi`
 * parametresi (çağıran okur ve `varsayilanEsik` ile geçer) → KRITIK_VARSAYILAN.
 *
 * Fonksiyon senkron kalmalı: hem sunucuda (queries) hem istemcide (liste
 * filtreleri) çağrılıyor. Bu yüzden parametreyi kendisi okumaz, dışarıdan alır.
 *
 * Negatif bakiye de "tükendi" sayılır — eksi stok zaten tutarsızlık işaretidir.
 */
export function stokDurumu(
  stok: number,
  minStok?: number | null,
  varsayilanEsik: number = KRITIK_VARSAYILAN,
): StokDurum {
  if (stok <= 0) return "tukendi";
  return stok <= (minStok ?? varsayilanEsik) ? "kritik" : "yeterli";
}

export const STOK_DURUM_ETIKET: Record<StokDurum, string> = {
  tukendi: "Tükendi",
  kritik: "Kritik",
  yeterli: "Yeterli",
};

export const STOK_DURUM_RENK: Record<StokDurum, string> = {
  tukendi: "bg-rose-100 text-rose-800",
  kritik: "bg-amber-100 text-amber-800",
  yeterli: "bg-emerald-100 text-emerald-800",
};
