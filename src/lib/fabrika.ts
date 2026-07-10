/**
 * Fabrika modeli — istasyonlar, üretim rotası ve 3D kroki yerleşimi.
 * Yerleşim kullanıcının verdiği krokiden: solda sevkiyat şeridi, ortada
 * depo/montaj/paketleme, sağda kesim/bantlama/delik.
 *
 * Koordinatlar plan düzleminde (x → sağ, z → aşağı), birim ≈ metre.
 */
// İstasyonlar artık DB'den tanımlanır (dinamik rota); slug serbest string.
export type IstasyonSlug = string;

export type Istasyon = {
  slug: IstasyonSlug;
  ad: string;
  /** Üretim rotası sırası (1'den). */
  sira?: number;
  /** Plan dikdörtgeni: [x, z] sol-üst köşe + [genişlik, derinlik] */
  konum: { x: number; z: number; g: number; d: number };
  renk: string; // bölüm kimlik rengi (etiket/panel vurgusu)
  durum?: "Aktif" | "Pasif";
};

/** Üretim rotası — emirler bu sırayla ilerler. */
export const ROTA: IstasyonSlug[] = [
  "kesim",
  "bantlama",
  "delik",
  "montaj",
  "paketleme",
  "sevkiyat",
];

export const ISTASYONLAR: Istasyon[] = [
  { slug: "kesim",     ad: "Kesim",         konum: { x: 25, z: 2,  g: 11, d: 5 },  renk: "#3b82f6" },
  { slug: "bantlama",  ad: "Bantlama",      konum: { x: 25, z: 8.5,  g: 11, d: 5 },  renk: "#8b5cf6" },
  { slug: "delik",     ad: "Delik",         konum: { x: 25, z: 15, g: 11, d: 9 },  renk: "#06b6d4" },
  { slug: "montaj",    ad: "Montaj",        konum: { x: 12, z: 13, g: 10, d: 5 },  renk: "#f97316" },
  { slug: "paketleme", ad: "Paketleme",     konum: { x: 12, z: 19.5, g: 10, d: 4.5 }, renk: "#f59e0b" },
  { slug: "sevkiyat",  ad: "Sevkiyat Alanı", konum: { x: 1,  z: 2,  g: 8,  d: 22 }, renk: "#10b981" },
];

/** Depo — rotada değil, sahnede duran malzeme deposu. */
export const DEPO = {
  ad: "Depo",
  konum: { x: 12, z: 2, g: 10, d: 9 },
  renk: "#737373",
};

/** Fabrika dış sınırları (zemin + duvarlar). */
export const FABRIKA = { g: 38, d: 26 };

export const ISTASYON_MAP = new Map(ISTASYONLAR.map((i) => [i.slug, i]));

export type AdimDurum = "Bekliyor" | "İşleniyor" | "Tamamlandı";

export type EmirAdimi = {
  istasyon: IstasyonSlug;
  sira: number;
  durum: AdimDurum;
  baslangic?: string;
  bitis?: string;
};

export type FabrikaEmri = {
  id: string;
  modelAd: string;
  adet: number;
  oncelik?: string;
  durum: string; // emir durumu (Planlandı/Üretimde/Tamamlandı/İptal)
  adimlar: EmirAdimi[];
};

/** Emrin şu an bulunduğu istasyon (İşleniyor olan; yoksa ilk Bekliyor). */
export function aktifIstasyon(e: FabrikaEmri): IstasyonSlug | null {
  const isleniyor = e.adimlar.find((a) => a.durum === "İşleniyor");
  if (isleniyor) return isleniyor.istasyon;
  const bekleyen = e.adimlar.find((a) => a.durum === "Bekliyor");
  return bekleyen?.istasyon ?? null;
}
