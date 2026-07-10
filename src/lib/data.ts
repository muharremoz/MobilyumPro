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

// Cari hesap (müşteri/tedarikçi/banka) — Cari Yönetimi modülü.
export type CariTip = "Müşteri" | "Tedarikçi" | "Her İkisi" | "Banka";
export type CariSinifi = "Bireysel" | "Kurumsal";
export type ParaBirimi = "TL" | "USD" | "EUR";
export type SatisFiyatTipi = "Maliyet" | "Satış Fiyatı 1" | "Satış Fiyatı 2";

export type Cari = {
  id: string;
  /** Kısa ad (listede görünen). */
  ad: string;
  /** Tam ad / ticari ad. */
  tamAd?: string;
  tip: CariTip;
  sinif: CariSinifi;
  /** Ana yetkili (hızlı erişim; detaylı liste yetkililer sekmesinde). */
  yetkili?: string;
  yetkiliUnvan?: string;
  yetkiliTelefon?: string;
  yetkiliEmail?: string;
  telefon?: string;
  telefon2?: string;
  telefon3?: string;
  fax?: string;
  email?: string;
  webSite?: string;
  satisFiyatTipi?: SatisFiyatTipi;
  /** İskonto oranı (%). */
  iskontoOrani?: number;
  /** Satış temsilcisi (kullanıcı adı). */
  temsilci?: string;
  /** Çoklu şube kullanımında bağlı mağaza şubesi. */
  sube?: string;
  muhasebeKodu?: string;
  // Fatura bilgileri
  tcKimlik?: string;
  vergiNo?: string;
  vergiDairesi?: string;
  unvan?: string;
  // Adres
  ulke?: string;
  bolge?: string;
  sehir?: string;
  semt?: string;
  adres?: string;
  /** Bakiye: pozitif = bizden alacaklı, negatif = bize borçlu. */
  bakiye: number;
  paraBirimi: ParaBirimi;
  durum: "Aktif" | "Pasif";
  not?: string;
};

export type CariBanka = {
  id: number;
  cariId: string;
  bankaAdi: string;
  sube?: string;
  iban?: string;
  aciklama?: string;
};

export type CariSube = {
  id: number;
  cariId: string;
  subeAdi: string;
  yetkili?: string;
  email?: string;
  telefon?: string;
  aciklama?: string;
  ulke?: string;
  sehir?: string;
  semt?: string;
  adres?: string;
};

export type CariYetkili = {
  id: number;
  cariId: string;
  yetkili: string;
  gorevi?: string;
  email?: string;
  telefon?: string;
  subeAdi?: string;
  aciklama?: string;
};

export type CariCrmTip =
  | "Telefon"
  | "Ziyaret"
  | "E-posta"
  | "Teklif"
  | "Toplantı"
  | "Diğer";
export type CariCrmDurum = "Planlandı" | "Tamamlandı" | "İptal";
export type CariCrm = {
  id: number;
  cariId: string;
  tarih: string;
  personel?: string;
  tip: CariCrmTip;
  durum: CariCrmDurum;
  aciklama?: string;
};

export type CariDokuman = {
  id: number;
  cariId: string;
  ad: string;
  url: string;
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

// Tanımlamalar — düz tanımlar (marka/koleksiyon/renk/kumaş/birim + adres
// seçenekleri: ülke/bölge/şehir/semt — formlarda "yeni ekle" ile büyür).
export type TanimTip =
  | "tip"
  | "marka"
  | "model"
  | "bolum"
  | "renkKodu"
  | "koleksiyon"
  | "renk"
  | "kumas"
  | "birim"
  | "ulke"
  | "bolge"
  | "sehir"
  | "semt";
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

// Stok kartı — birleşik kart (hammadde/yarı mamül/mamül/hizmet).
// Miktar ledger'a aittir; kart açıklayıcı alanları ve fiyatları tutar.
export type StokGrubu = "Hammadde" | "Yarı Mamül" | "Mamül" | "Hizmet";
export type Doviz = "TL" | "USD" | "EUR";

export type StokKarti = {
  id: string;
  /** Kullanıcı kodu (boşsa id gösterilir). */
  kod?: string;
  ad: string;
  tur?: string;
  cins?: string;
  grup: StokGrubu;
  altGrup?: string;
  detayGrup?: string;
  kategori?: string;
  marka?: string;
  model?: string;
  stokBirimi: string;
  puan?: number;
  yukseklik?: number;
  genislik?: number;
  boy?: number;
  agirlik?: number;
  minSiparis?: number;
  minStok?: number;
  maxStok?: number;
  muhasebeKodu?: string;
  /** Havuzdan seçilen reçete (parca.id). */
  receteParcaId?: string;
  /** Şimdilik sabit fabrika rotası. */
  rota?: string;
  ureticiCariId?: string;
  ureticiKodu?: string;
  bolum?: string;
  renkKodu?: string;
  barkod?: string;
  aciklama?: string;
  durum: "Aktif" | "Pasif";
  // Fiyatlar
  maliyetFiyati: number;
  maliyetBirimi: Doviz;
  satisFiyat1: number;
  satisBirim1: Doviz;
  satisFiyat2: number;
  satisBirim2: Doviz;
  satisFiyat3: number;
  satisBirim3: Doviz;
  satisFiyat4: number;
  satisBirim4: Doviz;
  satisFiyat5: number;
  satisBirim5: Doviz;
  /** Ledger'dan okunan mevcut miktar (ayna tablodan; Hizmet'te 0). */
  miktar: number;
};

export type StokUretici = {
  id: number;
  stokId: string;
  cariId: string;
  cariAd: string;
  ureticiKodu?: string;
  fiyat: number;
  doviz: Doviz;
  minSiparis?: number;
  tedarikGun?: number;
};

export type StokMusteri = {
  id: number;
  stokId: string;
  cariId: string;
  cariAd: string;
  musteriKodu?: string;
  minSiparis?: number;
  fiyat: number;
  doviz: Doviz;
  iskontoOrani?: number;
};

export type StokDokumanTipi =
  | "Ürün Resmi"
  | "Teknik Resim"
  | "PDF"
  | "Kalite Belgesi"
  | "Video"
  | "Diğer";
export type StokDokuman = {
  id: number;
  stokId: string;
  ad: string;
  url: string;
  tip: StokDokumanTipi;
};

// Satın alma — tedarikçiden malzeme alışı.
// Kaydedildiğinde stok girişi + cari Alacak işlemi otomatik oluşur.
export type AlisSatiri = {
  id: number;
  malzemeId: string;
  malzemeAd: string;
  miktar: number;
  birim: string;
  birimFiyat: Para;
};

export type Alis = {
  id: string;
  cariId: string;
  cariAd: string;
  tarih: string;
  depo: string;
  belgeNo?: string;
  aciklama?: string;
  toplam: Para;
  satirlar: AlisSatiri[];
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
