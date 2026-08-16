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
  /** Serbest etiketler (filtre/gruplama). Boş = etiketsiz. */
  etiketler?: string[];
  /** Sabitleme/yıldız (global — oturum yok). */
  favori?: boolean;
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
  /** Ait olduğu parça adı (ReceteGrup.ad); boş = parçasız bileşen. */
  grup?: string;
  /** Kenar bandı satırında hangi kenarlara uygulandığı. */
  bant?: KenarSecim;
};

/** Kenar bandı uygulanan kenarlar. */
export type KenarSecim = {
  ust?: boolean;
  alt?: boolean;
  sol?: boolean;
  sag?: boolean;
};

/**
 * Modülün bir parçası (ALT TABLA, SAĞ YAN...) — reçetenin bölümü.
 * Kesim ölçüleri burada; satırda değil, yoksa aynı bilgi her satırda
 * çoğalır ve kenar bandı uzunluğu hesaplanamazdı.
 */
export type ReceteGrup = {
  id?: number;
  ad: string;
  sira: number;
  kabaEn?: number;
  kabaBoy?: number;
  netEn?: number;
  netBoy?: number;
  bitmisEn?: number;
  bitmisBoy?: number;
  kalinlik?: number;
};

/** Parçanın tüketim ölçüsü: kaba varsa o, yoksa net, yoksa bitmiş. */
export function parcaOlcusu(g?: ReceteGrup): { en?: number; boy?: number } {
  if (!g) return {};
  if (g.kabaEn && g.kabaBoy) return { en: g.kabaEn, boy: g.kabaBoy };
  if (g.netEn && g.netBoy) return { en: g.netEn, boy: g.netBoy };
  return { en: g.bitmisEn, boy: g.bitmisBoy };
}

/** Bantlanan kenarların toplam uzunluğu (mm). Bant NET ölçüye uygulanır. */
export function bantUzunlugu(g?: ReceteGrup, bant?: KenarSecim): number {
  if (!g || !bant) return 0;
  const en = g.netEn ?? g.bitmisEn ?? g.kabaEn ?? 0;
  const boy = g.netBoy ?? g.bitmisBoy ?? g.kabaBoy ?? 0;
  // Üst/alt kenarlar EN boyunca, sol/sağ kenarlar BOY boyunca uzanır.
  return (
    (bant.ust ? en : 0) +
    (bant.alt ? en : 0) +
    (bant.sol ? boy : 0) +
    (bant.sag ? boy : 0)
  );
}

/**
 * Satırın miktarını PARÇA ölçüsünden hesaplar.
 *   m² birimli → kaba kesim alanı (en × boy) / 1.000.000
 *   m  birimli → seçili kenarların toplam uzunluğu / 1000 (kenar bandı)
 * Diğer birimlerde (adet, kg...) ölçüden miktar türetmek anlamsız — null
 * döner ve miktar elle girilir.
 */
export function satirMiktari(
  birim: string | undefined,
  grup?: ReceteGrup,
  bant?: KenarSecim,
): number | null {
  const b = (birim ?? "").trim().toLowerCase();
  if (b === "m²" || b === "m2") {
    const { en, boy } = parcaOlcusu(grup);
    if (!en || !boy) return null;
    return (en * boy) / 1_000_000;
  }
  if (b === "m" || b === "mt") {
    const mm = bantUzunlugu(grup, bant);
    return mm > 0 ? mm / 1000 : null;
  }
  return null;
}
/**
 * Malzeme kenarbandı tutkalı mı?
 *
 * Ad üzerinden tanınıyor: tutkal için ayrı bir malzeme tipi alanı yok ve
 * eklemek her fabrikanın stok kartlarını elden geçirmesini gerektirirdi.
 * Türkçe büyük/küçük harf farkı (İ/ı) için locale'li karşılaştırma şart.
 */
export function tutkalMi(ad?: string): boolean {
  return (ad ?? "").toLocaleLowerCase("tr").includes("tutkal");
}

/**
 * Tutkal parametresinin tanımlandığı referans bant genişliği (mm).
 *
 * Tutkal tüketimi bandın genişliğiyle doğru orantılı: 50 mm bant 12 mm bandın
 * dört katı yüzey yapıştırır. Parametre 21 mm için veriliyor, diğer
 * genişlikler buradan oranlanıyor.
 */
export const TUTKAL_REFERANS_GENISLIK = 21;

/** Bandın gerçek genişliğine göre "21 mm eşdeğeri" metre. */
export function tutkalEsdegerMetre(metre: number, genislik?: number): number {
  const g = genislik && genislik > 0 ? genislik : TUTKAL_REFERANS_GENISLIK;
  return metre * (g / TUTKAL_REFERANS_GENISLIK);
}

export type ParcaSatiri = { parcaId: string; miktar: number };

/**
 * Parça kategorisi — serbest metin (varsayılan öneriler KATEGORILER'de).
 * Kullanıcı formdan yeni kategori ekleyebilir.
 */
export type ParcaKategori = string;

/** Refakat kağıdındaki işlem sırası satırı (istasyon · makine · operasyon). */
export type ParcaIslem = {
  id?: number;
  /** Ait olduğu parçanın (reçete grubunun) adı. Boş = modül geneli. */
  grup?: string;
  sira: number;
  /** İstasyon slug'ı (kesim, bantlama …). */
  istasyon: string;
  makineId?: number;
  /** "NET KESİM", "UK1-(BOY ÖN)" gibi. */
  operasyon: string;
  aciklama?: string;
};

/** Genel Bakış panosunun departman bağımsız veri seti. Kartlar bundan beslenir. */
export type PanoVerisi = {
  /** Üretim */
  emirler: {
    id: string;
    urunAd: string;
    adet: number;
    durum: string;
    oncelik?: string;
    termin?: string;
    /** Şu an işlenen istasyon (slug) — yoksa sıradaki bekleyen. */
    istasyon?: string;
    istasyonAd?: string;
    /** Tamamlanan adım / toplam adım. */
    tamamAdim: number;
    toplamAdim: number;
  }[];
  /** İstasyon slug → o istasyonda bekleyen/işlenen emir sayısı. */
  istasyonKuyrugu: { slug: string; ad: string; renk: string; adet: number }[];
  /** Satın alma */
  onayBekleyenTalep: { id: string; tarih: string; kalem: number; tutar: number }[];
  siparissizKalem: number;
  bekleyenSiparis: {
    id: string;
    malzemeAd: string;
    cariAd: string;
    kalan: number;
    birim: string;
    tahminiTeslim?: string;
    gecikti: boolean;
  }[];
  /** Depo */
  kritikStok: {
    id: string;
    ad: string;
    stok: number;
    birim: string;
    minStok?: number;
  }[];
  malKabulBekleyen: number;
  sonHareketler: {
    id: string;
    tarih: string;
    tur: string;
    ad: string;
    miktar: number;
    birim: string;
  }[];
  /** Son 6 ayın satın alma harcaması — eskiden yeniye sıralı. */
  aylikAlis: { ay: string; etiket: string; tutar: number }[];
  /**
   * Sayım hatırlatması (sayim_uyari_gun). null → hatırlatma yok.
   * `gunGecti` null ise hiç tamamlanmış sayım yapılmamış demektir.
   */
  sayimUyari: {
    gunGecti: number | null;
    esik: number;
    sonTarih?: string;
  } | null;
  /** Yönetim özeti */
  ozet: {
    acikEmir: number;
    uretimdeEmir: number;
    acikTalep: number;
    kritikStokAdet: number;
    aylikAlisTutar: number;
    gecikenSiparis: number;
  };
};


/** Stok sayımı — fiili sayım belgesi (fark tamamlanınca ledger'a yazılır). */
export type SayimDurum = "Taslak" | "Tamamlandı" | "İptal";

export type SayimSatiri = {
  id: number;
  stokId: string;
  stokAd: string;
  birim: string;
  /** Sayım açılırken kayıtlı olan miktar. */
  sistem: number;
  /** Fiili sayım; undefined = henüz sayılmadı (0 ile aynı şey değil). */
  sayilan?: number;
};

export type Sayim = {
  id: string;
  tarih: string;
  depo: string;
  durum: SayimDurum;
  aciklama?: string;
  sorumlu?: string;
  tamamlama?: string;
  /** Kaç satır sayıldı / toplam satır. */
  sayilanAdet: number;
  satirAdet: number;
  /** Sayılan satırların net farkı (+ fazla, − eksik). */
  netFark: number;
};

export type SayimDetay = Sayim & { satirlar: SayimSatiri[] };

/** QR ile açılan atölye görünümü (login'siz; tezgahta telefonla okutulur). */
/**
 * Üretim ekranlarına giden koli dökümü — adları çözülmüş hâli.
 * Ekranın id'den ad araması gerekmesin diye sunucuda düzleştirilir.
 */
export type PaketDokumu = {
  sira: number;
  ad?: string;
  uzunluk?: number;
  genislik?: number;
  yukseklik?: number;
  agirlik?: number;
  olcuBirimi?: string;
  agirlikBirimi?: string;
  icerik: {
    tip: "malzeme" | "parca" | "poset";
    ad: string;
    miktar: number;
    /** Malzeme satırlarında birim (adet/m²...) — personel için anlamlı. */
    birim?: string;
  }[];
};

export type AtolyeGorunumu = {
  parcaId: string;
  parcaAd: string;
  modelId?: string;
  modelAd?: string;
  emirId?: string;
  emirAdet?: number;
  emirDurum?: string;
  olculer?: ParcaOlculeri;
  malzemeler: { ad: string; miktar: number }[];
  islemler: {
    sira: number;
    /** İşlemin ait olduğu parça (reçete grubu) adı. */
    parcaAd?: string;
    istasyonAd: string;
    makineAd?: string;
    operasyon: string;
  }[];
  dokumanlar: {
    ad: string;
    url: string;
    tip: string;
    kaynak: "Parça" | "Model";
  }[];
  /** Koli dökümü — paketleme personeli için. */
  paketler?: PaketDokumu[];
};

/** Bir parça için basılan refakat kağıdı (parça ürünle birlikte gezer). */
export type RefakatKagidi = {
  /** İş emri (UE-####). */
  emirId: string;
  emirTarihi: string;
  termin?: string;
  musteri?: string;
  hedefDepo?: string;
  /** Kağıdın barkodu (emir + parça). */
  barkod: string;
  /** Üretilen ürün (model) — parça üretiminde parçanın kendisi. */
  urunId: string;
  urunAd: string;
  /** Refakat kağıdının ait olduğu parça. */
  parcaId: string;
  parcaAd: string;
  /** Kaç parça basıldı / bu kaçıncı (10 / 3 gibi). */
  sayfaNo: number;
  sayfaToplam: number;
  /** Üretim miktarı: model adedi × parçanın modeldeki miktarı. */
  miktar: number;
  /** Ana plaka malzemesi (en büyük tüketimli m²/m malzeme). */
  malzeme?: string;
  /** Kenar bantları (PVC) — refakatta ayrı blok. */
  pvcler: string[];
  olculer?: ParcaOlculeri;
  /** İşlem sırası (istasyon · makine · operasyon). */
  islemler: {
    sira: number;
    /** İşlemin ait olduğu parça (reçete grubu) adı. */
    parcaAd?: string;
    istasyonAd: string;
    makineAd?: string;
    operasyon: string;
  }[];
  urunGorsel?: string;
  parcaGorsel?: string;
  /** Atölye görünümüne (login'siz doküman sayfası) giden QR — inline SVG. */
  qrSvg?: string;
  /** Koli dökümü — paketleme personeli için. */
  paketler?: PaketDokumu[];
};

/** İstasyona bağlı tezgah (SAWTECH EBATLAMA, EDGETECH 1 …). */
export type Makine = {
  id: number;
  ad: string;
  /** Bağlı istasyon slug'ı. */
  istasyon: string;
  sira: number;
  durum: "Aktif" | "Pasif";
};

/** Parçanın refakat kağıdı ölçüleri (mm). */
export type ParcaOlculeri = {
  kabaUzunluk?: number;
  kabaGenislik?: number;
  netUzunluk?: number;
  netGenislik?: number;
  bitmisUzunluk?: number;
  bitmisGenislik?: number;
  kalinlik?: number;
};

export type Parca = {
  id: string;
  ad: string;
  kategori: ParcaKategori;
  aciklama?: string;
  durum: "Aktif" | "Pasif";
  recete: ReceteSatiri[];
  /** Liste için ana görsel (dokümanlardan çözülür). */
  gorsel?: string;
  /** Liste görsel kolonu — tüm resimler (Ürün Resmi öncelikli). */
  gorseller?: string[];
  /** Refakat kağıdı ölçüleri (mm). */
  olculer?: ParcaOlculeri;
  /** Refakat kağıdındaki işlem sırası. */
  islemler?: ParcaIslem[];
  /** Koli dökümü — paketleme personeli için (bkz. ParcaPaket). */
  paketler?: ParcaPaket[];
  /** Reçetenin parçaları (ALT TABLA, SAĞ YAN...) ve kesim ölçüleri. */
  gruplar?: ReceteGrup[];
};

/**
 * Paket içeriği. Malzeme ve parça satırları PARÇANIN KENDİ REÇETESİNDEN
 * seçilir — koli, bu parçayı oluşturan bileşenlerin dağıtımıdır.
 * Poşet ayrı: hazır gruplanmış donanım tek satırda girer.
 */
export type PaketIcerik =
  | { tip: "malzeme"; malzemeId: string; miktar: number }
  | { tip: "parca"; parcaId: string; miktar: number }
  | { tip: "poset"; posetId: string; miktar: number };

/**
 * Bir kolinin tanımı. Paket ayrı bir parça kaydı DEĞİL, parçanın alt satırı.
 * Malzemeler doğrudan pakete yazılmaz; poşette gruplanıp poşet pakete girer.
 */
export type ParcaPaket = {
  id?: number;
  /** Paket 1, Paket 2... */
  sira: number;
  /** Opsiyonel ad ("Gövde Kolisi"); boşsa "Paket {sira}". */
  ad?: string;
  /** Koli dış ölçüleri — birim `olcuBirimi` alanında. */
  uzunluk?: number;
  genislik?: number;
  yukseklik?: number;
  /** Brüt ağırlık — birim `agirlikBirimi` alanında. */
  agirlik?: number;
  /** Üç ölçünün ortak birimi (mm | cm | m). */
  olcuBirimi?: OlcuBirimi;
  /** Ağırlık birimi (kg | g). */
  agirlikBirimi?: AgirlikBirimi;
  icerik: PaketIcerik[];
};

export const OLCU_BIRIMLERI = ["mm", "cm", "m"] as const;
export const AGIRLIK_BIRIMLERI = ["kg", "g"] as const;
export type OlcuBirimi = (typeof OLCU_BIRIMLERI)[number];
export type AgirlikBirimi = (typeof AGIRLIK_BIRIMLERI)[number];

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

/** Cari dokümanının türü — fiyat listesi ayrıca bayatlık ölçümünde kullanılır. */
export const CARI_DOKUMAN_TIPLERI = [
  "Fiyat Listesi",
  "Sözleşme",
  "Katalog",
  "Diğer",
] as const;
export type CariDokumanTipi = (typeof CARI_DOKUMAN_TIPLERI)[number];

export type CariDokuman = {
  id: number;
  cariId: string;
  ad: string;
  url: string;
  tip: CariDokumanTipi;
  /** Fiyat listesinin yürürlük tarihi (ISO). */
  gecerlilik?: string;
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
  /** Kart genişliği (mm) — kenar bandında tutkal hesabı buna göre ölçeklenir. */
  genislik?: number;
  /** Satın alma birimi (boşsa dönüşüm yok) — bkz. lib/birim.ts */
  alisBirimi?: string;
  /** 1 alış birimi kaç stok birimi eder. */
  alisCarpani?: number;
  /** Girilen birim fiyat hangi birime ait: "alis" | "stok". */
  alisFiyatBirimi?: "alis" | "stok";
  stok: number;
  birimFiyat: Para;
  /** Birim fiyatın dövizi (maliyet dövizi). */
  doviz?: Doviz;
  tedarikci?: string;
  /** Malzemenin tüketildiği varsayılan bölüm/istasyon (slug ya da ad). */
  bolum?: string;
  durum: "Aktif" | "Pasif";
  /** Liste için ana görsel (stok dokümanlarından çözülür). */
  gorsel?: string;
  /** Liste görsel kolonu — tüm resimler (Ürün Resmi öncelikli). */
  gorseller?: string[];
};

// Malzemenin alış/fiyat istihbaratı — reçete satırlarında hover kartı için.
export type MalzemeAlisOzeti = {
  malzemeId: string;
  /** En güncel alış (fiyat + firma + tarih). */
  sonAlis?: { fiyat: number; cariAd: string; tarih: string };
  minAlis?: { fiyat: number; cariAd: string; tarih: string };
  maxAlis?: { fiyat: number; cariAd: string; tarih: string };
  /** Satın alma şartlarındaki en yüksek anlaşma fiyatı (TL öncelikli). */
  maxSart?: { fiyat: number; cariAd: string; doviz: Doviz };
  /** Malzemenin tüm anlaşma şartları (fiyata göre azalan). */
  sartlar?: { cariAd: string; fiyat: number; doviz: Doviz }[];
  /** Firma bazında ortalama birim fiyat (alış adediyle). */
  firmaOrtalamalari: { cariAd: string; ortalama: number; alisSayisi: number }[];
  /** Malzemenin son stok hareketi. */
  sonHareket?: { tarih: string; tur: string; aciklama: string };
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
  /** "model" (mamül kartı) | "parca" (parça üretimi). */
  refTip?: "model" | "parca";
  urunId: string;
  urunAd: string;
  adet: number;
  durum: UretimDurum;
  oncelik?: UretimOncelik;
  olusturma: string; // ISO tarih
  terminBaslangic?: string; // planlanan üretim başlangıcı
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
  /** Poşetin ait olduğu ürün: mamül kartı ya da parça. */
  refTip?: "model" | "parca";
  refId?: string;
  // Poşetin hangi koliye gireceği ARTIK BURADA DEĞİL: paket, parçanın altında
  // tanımlanıp içeriğinde poşeti seçiyor (bkz. ParcaPaket). İki uçtan da
  // kurulabilseydi aynı bilginin iki kaynağı olurdu.
  malzemeler: PosetSatiri[];
};

// Tanımlamalar — düz tanımlar (marka/koleksiyon/renk/kumaş/birim + adres
// seçenekleri: ülke/bölge/şehir/semt — formlarda "yeni ekle" ile büyür).
export type TanimTip =
  | "cins"
  | "tip"
  | "marka"
  | "model"
  | "bolum"
  | "renkKodu"
  | "koleksiyon"
  | "renk"
  | "kumas"
  | "birim"
  // Parça adları (ALT TABLA, SAĞ YAN...) — modülü oluşturan paneller.
  | "parca"
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
  /** Yalnız renk için: rengin geçerli olduğu malzeme cinsleri (boş = hepsi). */
  cinsler?: string[];
};

// Tanımlamalar — stok grup ağacı (grup → alt grup → alt-alt grup ...).
export type StokGrup = {
  id: string;
  ad: string;
  /** Elle girilen grup kodu (örn. 150, AKS, 01). */
  kod: string;
  /** Üst grubun id'si; null → kök grup. */
  ustId: string | null;
  /** Aynı üst altındaki sürükle-bırak sırası (küçük → önce). */
  sira?: number;
  durum: "Aktif" | "Pasif";
  /** Bu grubu kullanan stok kartı sayısı (altGrup eşleşmesi; hesaplanır). */
  kullanim?: number;
};

// Döviz kuru — TCMB günlük bülteninden.
export type Kur = {
  kod: string; // USD, EUR...
  ad: string;
  birim: number;
  forexAlis: number;
  forexSatis: number;
  banknoteAlis: number;
  banknoteSatis: number;
  tarih: string; // TCMB bülten tarihi
  guncelleme: string; // son çekilme (yerel)
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
  /** Liste için ana görsel (dokümanlardan çözülür). */
  gorsel?: string;
  /** Liste görsel kolonu — tüm resimler (Ürün Resmi öncelikli). */
  gorseller?: string[];
  cins?: string;
  grup: StokGrubu;
  altGrup?: string;
  detayGrup?: string;
  kategori?: string;
  marka?: string;
  model?: string;
  stokBirimi: string;
  /** Satın alma birimi (boşsa dönüşüm yok) — bkz. lib/birim.ts */
  alisBirimi?: string;
  /** 1 alış birimi kaç stok birimi eder. */
  alisCarpani?: number;
  /** Girilen birim fiyat hangi birime ait: "alis" | "stok". */
  alisFiyatBirimi?: "alis" | "stok";
  puan?: number;
  yukseklik?: number;
  genislik?: number;
  boy?: number;
  kalinlik?: number;
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
  /** Dekor/renk adı (Tanımlamalar → Renkler; malzemenin cinsine göre süzülür). */
  renk?: string;
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
  /** Fiyatın son güncellenme tarihi (ISO). */
  fiyatTarihi?: string;
};

/** Satın alma şartı — stok_uretici kayıtlarının malzeme bilgisiyle görünümü. */
export type SatinAlmaSarti = StokUretici & {
  malzemeAd: string;
  birim: string;
  /**
   * Firmanın en güncel fiyat listesi (varsa). Listenin yürürlük tarihi şartın
   * fiyat tarihinden yeniyse fiyat "bayat" sayılır — PDF okunmaz, yalnız gösterilir.
   */
  fiyatListesi?: { ad: string; url: string; gecerlilik?: string };
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

// Satın alma talebi — onay havuzu + tedarik süreci.
// Beklemede → (Yönetici) Onaylandı | Reddedildi →
// (Satın Alma departmanı) Tedarik Sürecinde → satır satır mal kabul → Tamamlandı.
export type TalepDurum =
  | "Beklemede"
  | "Onaylandı"
  | "Reddedildi"
  | "Tedarik Sürecinde"
  | "Tamamlandı";

export type TalepSatirDurum =
  | "Bekliyor"
  | "Sipariş Verildi"
  | "Kısmi"
  | "Tedarik Edildi";

/** Bir talep satırının tek bir firmaya verilmiş siparişi (çok firmaya dağıtılabilir). */
export type TalepSiparis = {
  id: number;
  /** Bağlı olduğu sipariş belgesi (SIP-####; eski kayıtlarda yok). */
  siparisId?: string;
  cariId: string;
  cariAd: string;
  miktar: number;
  fiyat?: number;
  tarih: string;
  /** Bu siparişe karşı gelen (fatura eşleşmesiyle). */
  tedarikEdilen: number;
  /** Siparişi karşılayan alış fişleri (ALS-####). */
  alisIds?: string[];
};

/** Tedarikçiye verilen sipariş belgesi (bir firma = bir sipariş). */
export type SatinAlmaSiparis = {
  id: string;
  talepId: string;
  cariId: string;
  cariAd: string;
  tarih: string;
  depo?: string;
  notlar?: string;
  durum: "Açık" | "Kısmi" | "Kapandı";
  /** Tedarikçiye mail atıldıysa gönderim zamanı. */
  mailTarihi?: string;
  olusturanAd?: string;
  kalemler: {
    malzemeId: string;
    malzemeAd: string;
    birim: string;
    miktar: number;
    fiyat?: number;
    tedarikEdilen: number;
  }[];
  toplam: number;
};

export type TalepSatiri = {
  id: number;
  malzemeId: string;
  malzemeAd: string;
  /** İstenen toplam miktar. */
  miktar: number;
  birim: string;
  /** Şu ana dek teslim alınan (tüm siparişlerin toplamı). */
  tedarikEdilen: number;
  /** Mal kabul için önerilen birim fiyat (güncel maliyet). */
  tahminiFiyat: number;
  /** Malzeme kartındaki varsayılan üretici cari (dağıtımda öneri). */
  ureticiCariId?: string;
  durum: TalepSatirDurum;
  /** Bu satırın firmalara dağıtılmış siparişleri. */
  siparisler: TalepSiparis[];
};

export type SatinAlmaTalep = {
  id: string;
  tarih: string;
  kaynak: string; // "Üretim Planı" | "Manuel"
  /** Talebin hangi modeller için açıldığı (örn. "Travo Yatak Odası × 1"). */
  modeller?: string;
  aciklama?: string;
  durum: TalepDurum;
  /** Son bağlanan alış fişi (mal kabuller ALS-#### fişleri üretir). */
  alisId?: string;
  /** Mal kabulde önerilecek varsayılan depo. */
  depo?: string;
  /** Talebi doğuran üretimin bağlamı (sipariş üretiminde müşteri). */
  uretimMusteri?: string;
  uretimTermin?: string;
  uretimOncelik?: string;
  /** Bu talepten doğan üretim emirleri (UE-####). */
  uretimEmirleri?: string[];
  // Audit izi
  olusturanAd?: string;
  onaylayanAd?: string;
  onayTarihi?: string;
  redNedeni?: string;
  baslatanAd?: string;
  baslatmaTarihi?: string;
  satirlar: TalepSatiri[];
  /** Satırların güncel maliyet fiyatıyla tahmini tutarı (₺). */
  tahminiTutar: number;
};

// Bekleyen sipariş — talep satırlarında sipariş verilmiş ama tam tedarik
// edilmemiş kalemlerin talepler arası birleşik görünümü.
export type BekleyenSiparis = {
  talepId: string;
  satirId: number;
  /** Sipariş kaydının id'si (satır çok firmaya dağıtılabildiği için). */
  siparisId: number;
  /** Bağlı sipariş belgesi (SIP-####; eski kayıtlarda yok). */
  belgeId?: string;
  malzemeId: string;
  malzemeAd: string;
  birim: string;
  cariId: string;
  cariAd: string;
  /** Sipariş verilen miktar. */
  siparisMiktar: number;
  /** Şu ana dek gelen (tedarik edilen). */
  tedarikEdilen: number;
  /** Bekleyen (sipariş − gelen). */
  kalan: number;
  siparisFiyat?: number;
  siparisTarihi: string;
  /** Sipariş tarihi + şart tedarik süresi (varsa). */
  tahminiTeslim?: string;
  /** Tahmini teslim geçtiyse true. */
  gecikti: boolean;
  durum: TalepSatirDurum;
  // Malzemenin en güncel alış bilgisi (referans).
  sonAlisCariAd?: string;
  sonAlisFiyat?: number;
  sonAlisTarih?: string;
  /** Talebin hangi modeller için açıldığı (bilgi modalı). */
  modeller?: string;
  /** Mal kabul hedefi (talepteki depo). */
  depo?: string;
  /** Siparişi veren (audit). */
  olusturanAd?: string;
  /** Sipariş belgesindeki not. */
  notlar?: string;
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

// ── PROJE SİPARİŞ ────────────────────────────────────────────────────────

/** Şablon parçasına bağlı malzeme (miktar türetilen ölçüden hesaplanır). */
export type SablonParcaMalzeme = {
  id?: number;
  malzemeId: string;
  fire?: number;
  istasyon?: string;
  /** m²/metre dışı birimlerde (adet, kg) kullanılan sabit miktar. */
  sabitMiktar?: number;
};

/** Şablonun bir parçası. Ölçüler formülle modül ölçülerinden türer. */
export type SablonParca = {
  id?: number;
  ad: string;
  sira: number;
  adetFormul: string;
  enFormul: string;
  boyFormul: string;
  kalinlikFormul?: string;
  bant?: KenarSecim;
  malzemeler: SablonParcaMalzeme[];
};

/** Modül şablonu: bir dolabın iskeleti. */
export type ModulSablon = {
  id: string;
  ad: string;
  aciklama?: string;
  durum: "Aktif" | "Pasif";
  varsayilanEn?: number;
  varsayilanBoy?: number;
  varsayilanDerinlik?: number;
  varsayilanKalinlik?: number;
  varsayilanKapak?: number;
  varsayilanRaf?: number;
  varsayilanCekmece?: number;
  parcalar: SablonParca[];
};

export type ProjeDurum = "Teklif" | "Kazanıldı" | "Kaybedildi" | "İptal";

export type ProjeDokuman = {
  id?: number;
  ad: string;
  url: string;
  tip?: string;
};

/** Projeye eklenen modül örneğinin türetilmiş parçası. */
export type ProjeParca = {
  id?: number;
  ad: string;
  sira: number;
  adet: number;
  en?: number;
  boy?: number;
  kalinlik?: number;
  bant?: KenarSecim;
  /** Elle düzeltildiyse yeniden türetmede ezilmez. */
  elleDegisti?: boolean;
  malzemeler: { id?: number; malzemeId: string; miktar: number; fire?: number; istasyon?: string }[];
};

/** Projeye eklenen bir modül: "3 KAPAKLI DOLAP, 1200×2200×560". */
export type ProjeSatir = {
  id?: number;
  sablonId?: string;
  ad: string;
  sira: number;
  adet: number;
  en?: number;
  boy?: number;
  derinlik?: number;
  kalinlik?: number;
  kapakSayisi: number;
  rafSayisi: number;
  cekmeceSayisi: number;
  parcalar: ProjeParca[];
};

export type Proje = {
  id: string;
  ad: string;
  cariId?: string;
  durum: ProjeDurum;
  tarih: string;
  gecerlilik?: string;
  aciklama?: string;
  /** Kazanılınca üretilen model kaydı (tekrar dönüştürmeyi engeller). */
  modelId?: string;
  dokumanlar: ProjeDokuman[];
  satirlar: ProjeSatir[];
};
