/**
 * Sistem parametreleri — kodda sabit tanımlar (kullanıcı ekleyemez/silemez).
 * Kullanıcı yalnızca değeri değiştirir; değişen değerler DB'de
 * (sistem_parametre) anahtar→değer olarak saklanır. Kayıt yoksa varsayılan
 * geçerlidir.
 */
export type ParametreTip = "metin" | "sayi" | "boolean" | "secim";

export type ParametreTanim = {
  anahtar: string;
  etiket: string;
  aciklama: string;
  grup: string;
  tip: ParametreTip;
  varsayilan: string;
  /** tip === "secim" için seçenekler. */
  secenekler?: string[];
  /** sayi için birim eki (%, gün, dk...). */
  birim?: string;
  /**
   * Parametre gerçekten bir davranışı etkiliyor mu?
   *
   * "yakinda" olanlar kaydedilir ve ekranda görünür ama HİÇBİR ŞEY YAPMAZ.
   * Bu alan olmadan kullanıcı ayarı değiştirdiğini sanıyordu: örneğin oturum
   * süresini 4 saat yapıp kaydediyor, oturum yine 12 saat sürüyordu.
   * Bir parametreyi koda bağladığında buradaki işareti de kaldır.
   */
  durum?: "aktif" | "yakinda";
};

export const PARAMETRELER: ParametreTanim[] = [
  // ── Genel ───────────────────────────────────────────────────────────
  {
    anahtar: "firma_adi",
    etiket: "Firma Adı",
    // Açıklama eskiden "Rapor ve çıktılarda görünen firma unvanı" diyordu ama
    // rapor/çıktı tarafında hiç kullanılmıyor — yalnız kurulumda yazılıp
    // kurulum özetinde okunuyor. Vaat etmediğimiz şeyi yazmıyoruz.
    aciklama: "Kurulumda girilen firma unvanı.",
    grup: "Genel",
    tip: "metin",
    varsayilan: "MobilyumPro Mobilya",
  },
  {
    anahtar: "qr_taban_url",
    etiket: "QR Taban Adresi",
    aciklama:
      "Refakat kağıdındaki QR'ın işaret ettiği adres (örn. http://192.168.1.16:1616). Boş bırakılırsa sunucunun yerel ağ adresi otomatik bulunur.",
    grup: "Genel",
    tip: "metin",
    varsayilan: "",
  },
  {
    anahtar: "para_birimi",
    etiket: "Para Birimi",
    aciklama: "Fiyat ve tutarların gösterileceği varsayılan para birimi.",
    grup: "Genel",
    tip: "secim",
    varsayilan: "TL",
    secenekler: ["TL", "USD", "EUR"],
    durum: "yakinda",
  },
  {
    anahtar: "varsayilan_kdv",
    etiket: "Varsayılan KDV",
    // "Satış/fatura kalemleri" diyordu ama oyle bir ekran yok; parametre
    // Araçlar > KDV hesaplayıcısının başlangıç oranını belirliyor.
    aciklama: "KDV hesaplayıcısında başlangıç oranı.",
    grup: "Genel",
    tip: "sayi",
    varsayilan: "20",
    birim: "%",
  },
  {
    anahtar: "ondalik_basamak",
    etiket: "Ondalık Basamak",
    aciklama: "Miktar alanlarında gösterilecek ondalık hane sayısı.",
    grup: "Genel",
    tip: "sayi",
    varsayilan: "2",
    durum: "yakinda",
  },

  // ── Stok ────────────────────────────────────────────────────────────
  {
    anahtar: "kritik_stok_esigi",
    etiket: "Kritik Stok Eşiği",
    aciklama: "Stok bu adedin altına düşünce 'Kritik' uyarısı verilir.",
    grup: "Stok",
    tip: "sayi",
    varsayilan: "5",
    birim: "adet",
  },
  {
    anahtar: "negatif_stok",
    etiket: "Negatif Stok",
    aciklama:
      "Stok eksiye düşecek hareketlere izin verilsin mi? Kapalıysa yetersiz stokta üretim başlatılamaz/ilerletilemez; açıksa uyarı verilir ve devam edilir.",
    grup: "Stok",
    tip: "boolean",
    varsayilan: "false",
  },
  {
    anahtar: "uretimde_hemen_dus",
    etiket: "Üretimde Stokları Hemen Düş",
    aciklama:
      "Açıkken emir üretime geçtiği an reçetedeki tüm malzemeler stoktan düşer. Kapalıyken malzemeler rezerve edilir ve her fabrika istasyonu tamamlandıkça o istasyonun bileşenleri düşer.",
    grup: "Stok",
    tip: "boolean",
    varsayilan: "true",
  },
  {
    anahtar: "varsayilan_depo",
    etiket: "Varsayılan Depo",
    aciklama: "Yeni stok hareketlerinde önerilen depo kodu.",
    grup: "Stok",
    tip: "metin",
    varsayilan: "DEP-01",
  },
  {
    anahtar: "sayim_uyari_gun",
    etiket: "Sayım Hatırlatması",
    aciklama: "Son sayımdan bu kadar gün geçince hatırlatma gösterilir.",
    grup: "Stok",
    tip: "sayi",
    varsayilan: "90",
    birim: "gün",
  },

  // ── Üretim ──────────────────────────────────────────────────────────
  {
    anahtar: "varsayilan_fire",
    etiket: "Varsayılan Fire Payı",
    aciklama: "Reçete satırlarında önerilen fire yüzdesi.",
    grup: "Üretim",
    tip: "sayi",
    varsayilan: "3",
    birim: "%",
  },
  {
    anahtar: "varsayilan_oncelik",
    etiket: "Varsayılan Öncelik",
    aciklama: "Yeni üretim emirlerinde seçili gelen öncelik.",
    grup: "Üretim",
    tip: "secim",
    varsayilan: "Normal",
    secenekler: ["Düşük", "Normal", "Yüksek", "Acil"],
  },
  {
    anahtar: "varsayilan_termin",
    etiket: "Varsayılan Termin",
    aciklama: "Üretim planlarken önerilen termin süresi.",
    grup: "Üretim",
    tip: "sayi",
    varsayilan: "14",
    birim: "gün",
  },
  {
    anahtar: "otomatik_satinalma",
    etiket: "Otomatik Satın Alma Önerisi",
    aciklama: "Malzeme eksikse üretim planında satın alma önerilsin mi?",
    grup: "Üretim",
    tip: "boolean",
    varsayilan: "true",
  },

  // ── Satış & Cari ────────────────────────────────────────────────────
  {
    anahtar: "varsayilan_vade",
    etiket: "Varsayılan Vade",
    aciklama: "Cari borçlandırmalarda önerilen vade süresi.",
    grup: "Satış & Cari",
    tip: "sayi",
    varsayilan: "30",
    birim: "gün",
    durum: "yakinda",
  },
  {
    anahtar: "iskonto_limiti",
    etiket: "İskonto Üst Limiti",
    aciklama: "Satışta uygulanabilecek en yüksek iskonto oranı.",
    grup: "Satış & Cari",
    tip: "sayi",
    varsayilan: "20",
    birim: "%",
  },
  {
    anahtar: "belge_seri",
    etiket: "Belge Seri Öneki",
    aciklama: "Fatura/dekont belge numaralarının ön eki.",
    grup: "Satış & Cari",
    tip: "metin",
    varsayilan: "FAT-2026",
    durum: "yakinda",
  },
  {
    anahtar: "bakiye_uyari",
    etiket: "Bakiye Uyarısı",
    // "Satışta uyarı" diyordu; satış ekranı yok. Cari listesinde rozet
    // olarak gösteriliyor ve yalnız BİZE BORÇLU tarafta.
    aciklama:
      "Cari borcu bu tutarı aşınca cari listesinde uyarı rozeti çıkar (TL).",
    grup: "Satış & Cari",
    tip: "sayi",
    varsayilan: "100000",
    birim: "TL",
  },

  // ── Sistem ──────────────────────────────────────────────────────────
  {
    anahtar: "oturum_suresi",
    etiket: "Oturum Süresi",
    // "Hareketsiz kalınca" diyordu ama boşta kalma takibi YOK; süre
    // oturumun mutlak ömrü. Yapmadığımız şeyi vaat etmiyoruz.
    aciklama: "Oturumun geçerli kalacağı toplam süre (Beni hatırla hariç).",
    grup: "Sistem",
    tip: "sayi",
    varsayilan: "480",
    birim: "dk",
  },
  {
    anahtar: "sifre_min_uzunluk",
    etiket: "Asgari Şifre Uzunluğu",
    aciklama: "Kullanıcı şifreleri için en az karakter sayısı.",
    grup: "Sistem",
    tip: "sayi",
    // 6 idi; kod zaten 8 dayatıyordu. Parametreye bağlanınca 6'ya düşmesi
    // kuralı sessizce ZAYIFLATIRDI — davranışı korumak için 8'e çekildi.
    varsayilan: "8",
  },
  {
    anahtar: "yedekleme_saati",
    etiket: "Otomatik Yedekleme Saati",
    aciklama: "Günlük veritabanı yedeğinin alınacağı saat (SS:DD).",
    grup: "Sistem",
    tip: "metin",
    varsayilan: "23:00",
    durum: "yakinda",
  },
  {
    anahtar: "bakim_modu",
    etiket: "Bakım Modu",
    aciklama: "Açıkken yöneticiler dışındaki girişler engellenir.",
    grup: "Sistem",
    tip: "boolean",
    varsayilan: "false",
  },
];

/** Tanım sırasını koruyarak grup adlarını döndürür. */
export const PARAMETRE_GRUPLARI: string[] = [
  ...new Set(PARAMETRELER.map((p) => p.grup)),
];
