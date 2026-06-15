// MobilyumPro – panel için örnek (mock) veri.
// Gerçek API/veritabanı bağlanana kadar arayüzü beslemek için kullanılır.

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

export type Urun = {
  id: string;
  ad: string;
  kategori: Kategori;
  fiyat: Para;
  stok: number;
  durum: "Aktif" | "Pasif";
  gorsel?: string;
  /** Model (ürün) parçalı ise BOM için kullanılan parça satırları. */
  parcalar?: ParcaSatiri[];
};

// Reçete bileşeni — malzeme veya başka parça (alt-parça).
export type ReceteBilesen =
  | { tip: "malzeme"; ref: string }
  | { tip: "parca"; ref: string };
export type ReceteSatiri = { bilesen: ReceteBilesen; miktar: number };
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

export const urunler: Urun[] = [
  { id: "URN-1001", ad: "Milano 3+2 Koltuk Takımı", kategori: "Oturma Grubu", fiyat: 42500, stok: 12, durum: "Aktif" },
  { id: "URN-1002", ad: "Roma Yemek Masası 6 Kişilik", kategori: "Yemek Odası", fiyat: 18900, stok: 7, durum: "Aktif" },
  { id: "URN-1003", ad: "Loft Çalışma Masası", kategori: "Çalışma", fiyat: 6450, stok: 0, durum: "Pasif" },
  { id: "URN-1004", ad: "Venüs Yatak Odası Takımı", kategori: "Yatak Odası", fiyat: 56750, stok: 4, durum: "Aktif" },
  { id: "URN-1005", ad: "Nordic TV Ünitesi", kategori: "Oturma Grubu", fiyat: 8200, stok: 21, durum: "Aktif" },
  { id: "URN-1006", ad: "Comfort Berjer Koltuk", kategori: "Oturma Grubu", fiyat: 9750, stok: 3, durum: "Aktif" },
  { id: "URN-1007", ad: "Elegance Şifonyer", kategori: "Yatak Odası", fiyat: 5400, stok: 15, durum: "Aktif" },
  { id: "URN-1008", ad: "Minimal Kitaplık", kategori: "Çalışma", fiyat: 3900, stok: 2, durum: "Aktif" },
  { id: "URN-1009", ad: "Saten Halı 160x230", kategori: "Aksesuar", fiyat: 2750, stok: 33, durum: "Aktif" },
  { id: "URN-1010", ad: "Aurora Gardırop 4 Kapaklı", kategori: "Yatak Odası", fiyat: 22400, stok: 6, durum: "Aktif" },
];

export const siparisler: Siparis[] = [
  { id: "SIP-5021", musteri: "Ayşe Demir", tarih: "2026-06-05", tutar: 42500, durum: "Hazırlanıyor", urunAdedi: 1 },
  { id: "SIP-5020", musteri: "Mehmet Kaya", tarih: "2026-06-05", tutar: 27100, durum: "Kargoda", urunAdedi: 2 },
  { id: "SIP-5019", musteri: "Zeynep Şahin", tarih: "2026-06-04", tutar: 56750, durum: "Teslim Edildi", urunAdedi: 1 },
  { id: "SIP-5018", musteri: "Can Yıldız", tarih: "2026-06-04", tutar: 8200, durum: "Beklemede", urunAdedi: 1 },
  { id: "SIP-5017", musteri: "Elif Aydın", tarih: "2026-06-03", tutar: 12150, durum: "Teslim Edildi", urunAdedi: 3 },
  { id: "SIP-5016", musteri: "Burak Öztürk", tarih: "2026-06-02", tutar: 5400, durum: "İptal", urunAdedi: 1 },
  { id: "SIP-5015", musteri: "Selin Arslan", tarih: "2026-06-01", tutar: 22400, durum: "Kargoda", urunAdedi: 1 },
  { id: "SIP-5014", musteri: "Deniz Koç", tarih: "2026-05-31", tutar: 9750, durum: "Teslim Edildi", urunAdedi: 1 },
];

export const musteriler: Musteri[] = [
  { id: "MUS-301", ad: "Ayşe Demir", email: "ayse.demir@mail.com", sehir: "İstanbul", siparisSayisi: 5, toplamHarcama: 98500 },
  { id: "MUS-302", ad: "Mehmet Kaya", email: "mehmet.kaya@mail.com", sehir: "Ankara", siparisSayisi: 3, toplamHarcama: 47200 },
  { id: "MUS-303", ad: "Zeynep Şahin", email: "zeynep.sahin@mail.com", sehir: "İzmir", siparisSayisi: 2, toplamHarcama: 75150 },
  { id: "MUS-304", ad: "Can Yıldız", email: "can.yildiz@mail.com", sehir: "Bursa", siparisSayisi: 1, toplamHarcama: 8200 },
  { id: "MUS-305", ad: "Elif Aydın", email: "elif.aydin@mail.com", sehir: "Antalya", siparisSayisi: 4, toplamHarcama: 36300 },
  { id: "MUS-306", ad: "Burak Öztürk", email: "burak.ozturk@mail.com", sehir: "Adana", siparisSayisi: 2, toplamHarcama: 14600 },
];

// Üretim — hammadde/yarı mamul (BOM tabanı).
export type MalzemeTipi = "Hammadde" | "Yarı Mamul" | "Yardımcı";
export type Malzeme = {
  id: string;
  ad: string;
  tip: MalzemeTipi;
  birim: string; // m, m², adet, kg, lt
  stok: number;
  birimFiyat: Para;
  tedarikci?: string;
  durum: "Aktif" | "Pasif";
};

export const malzemeler: Malzeme[] = [
  { id: "MLZ-1001", ad: "MDF Levha 18mm", tip: "Hammadde", birim: "m²", stok: 240, birimFiyat: 380, tedarikci: "Kastamonu Entegre", durum: "Aktif" },
  { id: "MLZ-1002", ad: "Sünger 40 Dansite", tip: "Hammadde", birim: "m³", stok: 18, birimFiyat: 2400, tedarikci: "İzopolimer", durum: "Aktif" },
  { id: "MLZ-1003", ad: "Keten Kumaş Krem", tip: "Hammadde", birim: "m", stok: 320, birimFiyat: 185, tedarikci: "Boyteks", durum: "Aktif" },
  { id: "MLZ-1004", ad: "Kadife Kumaş Antrasit", tip: "Hammadde", birim: "m", stok: 145, birimFiyat: 245, tedarikci: "Boyteks", durum: "Aktif" },
  { id: "MLZ-1005", ad: "Kontrplak 12mm", tip: "Hammadde", birim: "m²", stok: 90, birimFiyat: 290, tedarikci: "Hayat Ahşap", durum: "Aktif" },
  { id: "MLZ-1006", ad: "Cila Mat Ceviz", tip: "Yardımcı", birim: "lt", stok: 36, birimFiyat: 320, tedarikci: "Akzo Nobel", durum: "Aktif" },
  { id: "MLZ-1007", ad: "Vida 4×40", tip: "Yardımcı", birim: "adet", stok: 12400, birimFiyat: 0.45, tedarikci: "Norm Cıvata", durum: "Aktif" },
  { id: "MLZ-1008", ad: "Menteşe Bas-Aç", tip: "Yardımcı", birim: "adet", stok: 860, birimFiyat: 18, tedarikci: "Samet", durum: "Aktif" },
  { id: "MLZ-1009", ad: "Çekmece Rayı 45cm", tip: "Yardımcı", birim: "adet", stok: 240, birimFiyat: 95, tedarikci: "Samet", durum: "Aktif" },
  { id: "MLZ-1010", ad: "Yatak Çerçevesi (Karkas)", tip: "Yarı Mamul", birim: "adet", stok: 22, birimFiyat: 1800, durum: "Aktif" },
  { id: "MLZ-1011", ad: "PVC Kenar Bandı Beyaz", tip: "Yardımcı", birim: "m", stok: 480, birimFiyat: 8, tedarikci: "Roma Plastik", durum: "Aktif" },
  { id: "MLZ-1012", ad: "Ayna Cam 4mm", tip: "Hammadde", birim: "m²", stok: 32, birimFiyat: 420, tedarikci: "Şişecam", durum: "Aktif" },
];

// Üretim — parçalar (BOM kataloğu).
// Reçetede malzeme veya başka parça (alt-parça) olabilir.
export const parcalar: Parca[] = [
  {
    id: "PRC-2001",
    ad: "Yatak Çerçevesi (Karkas)",
    kategori: "Karyola",
    aciklama: "Standart 160×200 cm",
    durum: "Aktif",
    recete: [
      { bilesen: { tip: "malzeme", ref: "MLZ-1005" }, miktar: 4.5 }, // Kontrplak
      { bilesen: { tip: "malzeme", ref: "MLZ-1007" }, miktar: 60 }, // Vida
      { bilesen: { tip: "malzeme", ref: "MLZ-1006" }, miktar: 0.4 }, // Cila
    ],
  },
  {
    id: "PRC-2002",
    ad: "Karyola Başlığı (Yastıklı)",
    kategori: "Karyola",
    aciklama: "Kumaş kaplı yastıklı başlık",
    durum: "Aktif",
    recete: [
      { bilesen: { tip: "malzeme", ref: "MLZ-1005" }, miktar: 0.8 }, // Kontrplak
      { bilesen: { tip: "malzeme", ref: "MLZ-1002" }, miktar: 0.05 }, // Sünger m³
      { bilesen: { tip: "malzeme", ref: "MLZ-1003" }, miktar: 2.2 }, // Keten kumaş
      { bilesen: { tip: "malzeme", ref: "MLZ-1007" }, miktar: 24 }, // Vida
    ],
  },
  {
    id: "PRC-2003",
    ad: "Karyola (Tam)",
    kategori: "Karyola",
    aciklama: "Çerçeve + başlık birleşik karyola",
    durum: "Aktif",
    recete: [
      { bilesen: { tip: "parca", ref: "PRC-2001" }, miktar: 1 }, // Yatak çerçevesi
      { bilesen: { tip: "parca", ref: "PRC-2002" }, miktar: 1 }, // Başlık
    ],
  },
  {
    id: "PRC-2004",
    ad: "Komidin 2 Çekmeceli",
    kategori: "Komidin",
    aciklama: "Standart komidin",
    durum: "Aktif",
    recete: [
      { bilesen: { tip: "malzeme", ref: "MLZ-1001" }, miktar: 0.9 }, // MDF
      { bilesen: { tip: "malzeme", ref: "MLZ-1009" }, miktar: 2 }, // Çekmece rayı
      { bilesen: { tip: "malzeme", ref: "MLZ-1007" }, miktar: 30 }, // Vida
      { bilesen: { tip: "malzeme", ref: "MLZ-1011" }, miktar: 4.5 }, // PVC kenar bandı
      { bilesen: { tip: "malzeme", ref: "MLZ-1006" }, miktar: 0.2 }, // Cila
    ],
  },
  {
    id: "PRC-2005",
    ad: "Şifonyer 4 Çekmeceli",
    kategori: "Şifonyer",
    aciklama: "Standart şifonyer",
    durum: "Aktif",
    recete: [
      { bilesen: { tip: "malzeme", ref: "MLZ-1001" }, miktar: 2.4 }, // MDF
      { bilesen: { tip: "malzeme", ref: "MLZ-1009" }, miktar: 4 }, // Çekmece rayı
      { bilesen: { tip: "malzeme", ref: "MLZ-1007" }, miktar: 64 }, // Vida
      { bilesen: { tip: "malzeme", ref: "MLZ-1011" }, miktar: 9.5 }, // PVC bant
      { bilesen: { tip: "malzeme", ref: "MLZ-1006" }, miktar: 0.45 }, // Cila
    ],
  },
  {
    id: "PRC-2006",
    ad: "Boy Ayna 60×180",
    kategori: "Ayna",
    aciklama: "MDF çerçeveli boy aynası",
    durum: "Aktif",
    recete: [
      { bilesen: { tip: "malzeme", ref: "MLZ-1012" }, miktar: 1.08 }, // Ayna camı
      { bilesen: { tip: "malzeme", ref: "MLZ-1001" }, miktar: 0.6 }, // MDF
      { bilesen: { tip: "malzeme", ref: "MLZ-1006" }, miktar: 0.15 }, // Cila
      { bilesen: { tip: "malzeme", ref: "MLZ-1007" }, miktar: 12 }, // Vida
    ],
  },
  {
    id: "PRC-2007",
    ad: "Gardırop 4 Kapaklı",
    kategori: "Gardırop",
    aciklama: "Sürmeli kapaklı, raflı",
    durum: "Aktif",
    recete: [
      { bilesen: { tip: "malzeme", ref: "MLZ-1001" }, miktar: 6.8 }, // MDF
      { bilesen: { tip: "malzeme", ref: "MLZ-1005" }, miktar: 1.2 }, // Kontrplak
      { bilesen: { tip: "malzeme", ref: "MLZ-1008" }, miktar: 12 }, // Menteşe
      { bilesen: { tip: "malzeme", ref: "MLZ-1007" }, miktar: 120 }, // Vida
      { bilesen: { tip: "malzeme", ref: "MLZ-1011" }, miktar: 22 }, // PVC bant
      { bilesen: { tip: "malzeme", ref: "MLZ-1006" }, miktar: 0.8 }, // Cila
    ],
  },
];

// Bir kaç ürünü (modeli) parçalarla bağla — Üretim Reçetesi için demo.
urunler[3].parcalar = [
  { parcaId: "PRC-2003", miktar: 1 }, // Karyola
  { parcaId: "PRC-2004", miktar: 2 }, // Komidin x2
  { parcaId: "PRC-2005", miktar: 1 }, // Şifonyer
  { parcaId: "PRC-2006", miktar: 1 }, // Boy ayna
];
urunler[9].parcalar = [
  { parcaId: "PRC-2007", miktar: 1 }, // Gardırop 4 kapaklı
];
urunler[6].parcalar = [
  { parcaId: "PRC-2005", miktar: 1 }, // Elegance Şifonyer → Şifonyer 4 çekmeceli
];

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

// Depolar (üretim hedefi / stok lokasyonu).
export type Depo = {
  id: string;
  ad: string;
  sehir: string;
  kapasite: number;
  doluluk: number;
  durum: "Aktif" | "Pasif";
};

export const depolar: Depo[] = [
  { id: "DEP-01", ad: "Ana Depo", sehir: "İstanbul", kapasite: 5000, doluluk: 3420, durum: "Aktif" },
  { id: "DEP-02", ad: "Yedek Depo", sehir: "İstanbul", kapasite: 2000, doluluk: 880, durum: "Aktif" },
  { id: "DEP-03", ad: "Showroom Merkez", sehir: "İstanbul", kapasite: 300, doluluk: 215, durum: "Aktif" },
  { id: "DEP-04", ad: "Bursa Bölge", sehir: "Bursa", kapasite: 1500, doluluk: 0, durum: "Pasif" },
];

export const uretimEmirleri: UretimEmri[] = [
  {
    id: "UE-4001",
    urunId: "URN-1004",
    urunAd: "Venüs Yatak Odası Takımı",
    adet: 3,
    durum: "Üretimde",
    olusturma: "2026-06-04",
    termin: "2026-06-12",
    kaynakSiparis: "SIP-5019",
  },
  {
    id: "UE-4002",
    urunId: "URN-1010",
    urunAd: "Aurora Gardırop 4 Kapaklı",
    adet: 5,
    durum: "Planlandı",
    olusturma: "2026-06-05",
    termin: "2026-06-15",
  },
  {
    id: "UE-4003",
    urunId: "URN-1004",
    urunAd: "Venüs Yatak Odası Takımı",
    adet: 2,
    durum: "Tamamlandı",
    olusturma: "2026-05-28",
    termin: "2026-06-03",
  },
];

// Dashboard kartları için özet metrikler.
export const ozet = {
  toplamCiro: siparisler
    .filter((s) => s.durum !== "İptal")
    .reduce((t, s) => t + s.tutar, 0),
  siparisSayisi: siparisler.length,
  urunSayisi: urunler.length,
  musteriSayisi: musteriler.length,
  kritikStok: urunler.filter((u) => u.stok > 0 && u.stok <= 5).length,
  tukenenStok: urunler.filter((u) => u.stok === 0).length,
};

// Son 7 günlük satış (basit çubuk grafik için).
export const haftalikSatis = [
  { gun: "Pzt", tutar: 32000 },
  { gun: "Sal", tutar: 51000 },
  { gun: "Çar", tutar: 28000 },
  { gun: "Per", tutar: 64000 },
  { gun: "Cum", tutar: 47000 },
  { gun: "Cmt", tutar: 89000 },
  { gun: "Paz", tutar: 41000 },
];
