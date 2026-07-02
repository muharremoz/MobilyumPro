/**
 * Yetkilendirme sabitleri — rol × modül erişim matrisi.
 * Modül id'leri nav-config section id'leriyle birebir (enforcement
 * middleware/nav'da bu id üzerinden yapılacak).
 */
export const ERISIMLER = ["Yok", "Görüntüleme", "Tam"] as const;
export type Erisim = (typeof ERISIMLER)[number];

export type Modul = { id: string; label: string };

export const MODULLER: Modul[] = [
  { id: "genel-bakis", label: "Genel Bakış" },
  { id: "stok", label: "Stok Yönetimi" },
  { id: "tanimlamalar", label: "Tanımlamalar" },
  { id: "siparis", label: "Sipariş Yönetimi" },
  { id: "sevkiyat", label: "Sevkiyat" },
  { id: "satin-alma", label: "Satın Alma" },
  { id: "uretim-plan", label: "Üretim Planı" },
  { id: "uretim-takibi", label: "Üretim Takibi" },
  { id: "ssh", label: "Satış Sonrası Hizmet" },
  { id: "maliyet", label: "Maliyet" },
  { id: "verimlilik", label: "Verimlilik & Performans" },
  { id: "raporlama", label: "Raporlama" },
  { id: "cari", label: "Cari Yönetimi" },
  { id: "kullanicilar", label: "Kullanıcılar & Roller" },
  { id: "ayarlar", label: "Ayarlar" },
];

/** rolAd → (modulId → erisim). Kaydı olmayan modül "Yok" kabul edilir. */
export type YetkiMatrisi = Record<string, Record<string, Erisim>>;
