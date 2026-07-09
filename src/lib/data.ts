// MobilyumPro – ortak alan tipleri ve biçimleyiciler.
// Veri SQL Server'dan gelir (src/lib/db); burada mock veri tutulmaz.

export type Para = number;

export const formatTL = (v: Para) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v);

export const formatTarih = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

export type Kategori =
  | "Oturma Grubu"
  | "Yatak Odası"
  | "Yemek Odası"
  | "Çalışma"
  | "Aksesuar";

export type ModelVaryant = {
  id: string;
  renk?: string;
  kumas?: string;
  ekFiyat?: number;
};

export type Model = {
  id: string;
  ad: string;
  /** Stok grubu adı (Tanımlamalar → Gruplar ağacından seçilir). */
  kategori: string;
  fiyat: Para;
  stok: number;
  durum: "Aktif" | "Pasif";
  gorsel?: string;
  /** Model (ürün) parçalı ise BOM için kullanılan parça satırları. */
  parcalar?: ParcaSatiri[];
  /** Üretici markası (Tanımlamalar → Markalar). */
  marka?: string;
  /** Barkod (kod farklı kullanılabilir). */
  barkod?: string;
  /** Birim ağırlık, kg. */
  agirlik?: number;
  /** Kritik stok eşiği; bunun altına düşünce uyarı. */
  minStok?: number;
  /** Görsel galerisi (URL'ler). İlk öğe ana görsel sayılır. */
  gorseller?: string[];
  /** Renk / Kumaş varyantları (her satır bir kombinasyon). */
  varyantlar?: ModelVaryant[];
};

// Reçete bileşeni — malzeme veya başka parça (alt-parça).
export type ReceteBilesen =
  | { tip: "malzeme"; ref: string }
  | { tip: "parca"; ref: string };
export type ReceteSatiri = {
  bilesen: ReceteBilesen;
  miktar: number;
  /** Fire payı (%): brüt ihtiyaç = miktar × (1 + fire/100). */
  fire?: number;
  /** Malzemenin tüketildiği fabrika istasyonu (slug); boşsa ilk istasyon. */
  istasyon?: string;
};
export type ParcaSatiri = { parcaId: string; miktar: number };

export type ParcaKategori =
  | "Karyola"
  | "Komidin"
  | "Şifonyer"
  | "Gardırop"
  | "Ayna"
  | "Sehpa"
  | "Koltuk"
  | "Diğer";

export type Parca = {
  id: string;
  ad: string;
  kategori: ParcaKategori;
  aciklama?: string;
  durum: "Aktif" | "Pasif";
  recete: ReceteSatiri[];
};

// Stok hareketleri — model (ürün) veya malzeme için.
export type StokHareketTuru = "Giriş" | "Çıkış" | "Transfer";
export type StokHareketRef =
  | { tip: "model"; id: string }
  | { tip: "malzeme"; id: string };
export type StokHareket = {
  id: string;
  tarih: string;
  tur: StokHareketTuru;
  ref: StokHareketRef;
  miktar: number;
  birim: string; // ürünler için "adet", malzemeler kendi birimi
  depo: string;
  aciklama: string;
};

// Cari hesap (müşteri/tedarikçi) — Cari Yönetimi modülü.
export type CariTip = "Müşteri" | "Tedarikçi" | "Her İkisi";
export type CariSinifi = "Bireysel" | "Kurumsal";
export type ParaBirimi = "TL" | "USD" | "EUR";

export type Cari = {
  id: string;
  ad: string;
  tip: CariTip;
  sinif: CariSinifi;
  vergiNo?: string;
  vergiDairesi?: string;
  telefon?: string;
  email?: string;
  adres?: string;
  sehir?: string;
  /** Bakiye: pozitif = bizden alacaklı, negatif = bize borçlu. */
  bakiye: number;
  paraBirimi: ParaBirimi;
  durum: "Aktif" | "Pasif";
  not?: string;
};

// Cari işlemleri — tahsilat/ödeme/borç/alacak hareketleri.
export type CariIslemTuru = "Tahsilat" | "Ödeme" | "Borç" | "Alacak";
export type CariIslem = {
  id: string;
  cariId: string;
  tarih: string;
  tur: CariIslemTuru;
  tutar: number;
  belge?: string;
  aciklama: string;
};

export type SiparisDurum =
  | "Beklemede"
  | "Hazırlanıyor"
  | "Kargoda"
  | "Teslim Edildi"
  | "İptal";

export type Siparis = {
  id: string;
  musteri: string;
  tarih: string;
  tutar: Para;
  durum: SiparisDurum;
  urunAdedi: number;
};

export type Musteri = {
  id: string;
  ad: string;
  email: string;
  sehir: string;
  siparisSayisi: number;
  toplamHarcama: Para;
};

// Üretim — hammadde/yarı mamul (BOM tabanı).
export type Malzeme = {
  id: string;
  ad: string;
  /** Stok grubu adı (Tanımlamalar → Gruplar ağacından). */
  grup?: string;
  birim: string; // m, m², adet, kg, lt
  stok: number;
  birimFiyat: Para;
  tedarikci?: string;
  durum: "Aktif" | "Pasif";
};

// Üretim emirleri — bir modelin (ürünün) BOM'una göre üretimi.
export type UretimDurum =
  | "Planlandı"
  | "Üretimde"
  | "Tamamlandı"
  | "İptal";

export type UretimOncelik = "Düşük" | "Normal" | "Yüksek" | "Acil";

export type UretimEmri = {
  id: string;
  urunId: string;
  urunAd: string;
  adet: number;
  durum: UretimDurum;
  oncelik?: UretimOncelik;
  olusturma: string; // ISO tarih
  termin?: string; // hedef bitiş tarihi
  kaynakSiparis?: string; // opsiyonel: hangi siparişten doğdu
  musteri?: string; // sipariş üretiminde hedef müşteri
  hedefDepo?: string; // stok üretiminde hedef depo
  not?: string;
};

// Malzeme Poşeti — bir montaj/üretim için hazır malzeme seti.
export type PosetSatiri = { malzemeId: string; miktar: number };
export type Poset = {
  id: string;
  ad: string;
  aciklama?: string;
  durum: "Aktif" | "Pasif";
  malzemeler: PosetSatiri[];
};

// Tanımlamalar — düz tanımlar (marka/koleksiyon/renk/kumaş/birim).
export type TanimTip = "marka" | "koleksiyon" | "renk" | "kumas" | "birim";
export type TanimKalemi = {
  id: string;
  ad: string;
  /** Bu tanımı kullanan kayıt sayısı (hesaplanır). */
  adet: number;
  durum: "Aktif" | "Pasif";
};

// Tanımlamalar — stok grup ağacı (grup → alt grup → alt-alt grup ...).
export type StokGrup = {
  id: string;
  ad: string;
  /** Elle girilen grup kodu (örn. 150, AKS, 01). */
  kod: string;
  /** Üst grubun id'si; null → kök grup. */
  ustId: string | null;
  durum: "Aktif" | "Pasif";
};

// Depolar (üretim hedefi / stok lokasyonu).
export type Depo = {
  id: string;
  ad: string;
  sehir: string;
  kapasite: number;
  doluluk: number;
  durum: "Aktif" | "Pasif";
};
