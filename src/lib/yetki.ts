/**
 * Yetkilendirme sabitleri — rol × modül erişim matrisi.
 * Modül id'leri nav-config section id'leriyle birebir (enforcement
 * middleware/nav'da bu id üzerinden yapılacak).
 */
/** Modül başına yetki bayrakları (checkbox kolonları). */
export const YETKI_BAYRAKLARI = [
  {
    key: "isList",
    label: "Liste",
    aciklama: "Bağlı menüde yapılan işlem listesini görsün mü",
  },
  { key: "isAdd", label: "Ekle", aciklama: "Yeni kayıt ekleyebilsin mi" },
  {
    key: "isUpdate",
    label: "Güncelle",
    aciklama: "Mevcut kaydı düzenleyebilsin mi",
  },
  { key: "isDelete", label: "Sil", aciklama: "Kayıt silebilsin mi" },
] as const;

export type YetkiBayrak = (typeof YETKI_BAYRAKLARI)[number]["key"];

/** Bir modül için 5 bayrağın açık/kapalı durumu. */
export type ModulYetki = Record<YetkiBayrak, boolean>;

export const BOS_YETKI: ModulYetki = {
  isList: false,
  isAdd: false,
  isUpdate: false,
  isDelete: false,
};

export type Modul = { id: string; label: string };

// Yalnızca sayfası yapılmış modüller; yeni modül açıldıkça eklenir.
export const MODULLER: Modul[] = [
  { id: "genel-bakis", label: "Genel Bakış" },
  { id: "stok", label: "Stok Yönetimi" },
  { id: "tanimlamalar", label: "Tanımlamalar" },
  { id: "siparis", label: "Sipariş Yönetimi" },
  { id: "uretim-plan", label: "Üretim Planı" },
  { id: "uretim-takibi", label: "Üretim Takibi" },
  { id: "cari", label: "Cari Yönetimi" },
  { id: "kullanicilar", label: "Kullanıcılar & Roller" },
  { id: "ayarlar", label: "Ayarlar" },
];

/** özne (rolAd/kullaniciId) → (modulId → bayraklar). Kaydı olmayan modül BOS_YETKI. */
export type YetkiMatrisi = Record<string, Record<string, ModulYetki>>;

/** Bir kullanıcının bir cariye erişim bayrakları (varsayılan ikisi de açık). */
export type CariYetki = { goruntule: boolean; islemYap: boolean };
export const CARI_TAM: CariYetki = { goruntule: true, islemYap: true };

/** Adlandırılmış yetki seti (izin şablonu): modulId → bayraklar. */
export type YetkiSeti = {
  id: number;
  ad: string;
  yetkiler: Record<string, ModulYetki>;
};
