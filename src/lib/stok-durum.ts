/**
 * PROJE STANDARDI — stok yeterlilik durumu.
 *
 * Eşik üç ayrı yerde birbirinden bağımsız tanımlıydı: pano `minStok`'a
 * bakıyor, stok durumu ekranı ve özet ise sabit 5 kullanıyordu. Aynı ürün
 * panoda "kritik", stok durumunda "yeterli" görünebiliyordu. Tek kaynak burası.
 */

/** Kartta minStok tanımlı değilse kullanılan eşik. */
export const KRITIK_VARSAYILAN = 5;

export type StokDurum = "tukendi" | "kritik" | "yeterli";

/**
 * Kartın durumu. `minStok` tanımlıysa eşik odur; değilse varsayılan kullanılır.
 * Negatif bakiye de "tükendi" sayılır — eksi stok zaten tutarsızlık işaretidir.
 */
export function stokDurumu(stok: number, minStok?: number | null): StokDurum {
  if (stok <= 0) return "tukendi";
  return stok <= (minStok ?? KRITIK_VARSAYILAN) ? "kritik" : "yeterli";
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
