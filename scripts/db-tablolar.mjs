/**
 * Yedek/geri-yükleme tablo sırası — EBEVEYN → ÇOCUK.
 * Geri yüklerken bu sırayla yazılır, silerken tersten silinir (FK).
 * Yeni tablo eklendiğinde buraya da eklenmeli.
 */
export const TABLO_SIRASI = [
  // Ayarlar / altyapı
  "depo",
  "rol",
  "rolYetki",
  "departman",
  "kullanici",
  "kullaniciYetki",
  "yetkiSeti",
  "yetkiSetiDetay",
  "listeAyar",
  "sayac",
  "sistemParametre",
  "grup",
  "tanim",
  "kur",
  "istasyon",
  "makine",
  // Kartlar
  "cari",
  "cariBanka",
  "cariSube",
  "cariYetkili",
  "cariCrm",
  "cariDokuman",
  "kullaniciCariYetki",
  "musteri",
  "stok",
  "stokDokuman",
  "stokUretici",
  "stokMusteri",
  "parca",
  "parcaDokuman",
  // Grup, satır VE işlemden ÖNCE: ikisi de gruba FK ile bağlı.
  "receteGrup",
  "parcaIslem",
  "receteSatiri",
  "receteVersiyon",
  "modelParca",
  "poset",
  "posetMalzeme",
  // Paketleme: içerik hem parçaya hem poşete bağlanıyor, ikisinden de sonra.
  "parcaPaket",
  "parcaPaketIcerik",
  // Hareketler / belgeler
  "siparis",
  "cariIslem",
  "stokHareket",
  "uretimEmri",
  "uretimEmriAdim",
  "alis",
  "alisSatiri",
  "satinAlmaTalep",
  "satinAlmaTalepSatiri",
  "satinAlmaSiparis",
  "satinAlmaTalepSiparis",
  "sayim",
  "sayimSatiri",
  // Proje sipariş: şablon → parça → malzeme, sonra proje → satır → parça.
  "modulSablon",
  "sablonParca",
  "sablonParcaMalzeme",
  "proje",
  "projeDokuman",
  "projeSatir",
  "projeParca",
  "projeParcaMalzeme",
];

/** Kendine referans veren tablolar: aynı tablo içinde üst→alt sırası korunmalı. */
export const KENDINE_REFERANS = { grup: "ustId" };

/**
 * Otomatik artan (IDENTITY) id'si olan tablolar → DB tablo adı.
 * SQL Server bu kolonlara açıkça id yazılmasına izin vermez; geri yüklerken
 * SET IDENTITY_INSERT <tablo> ON gerekir (id'ler korunmalı, çocuklar bağlı).
 */
export const IDENTITY_TABLOLAR = {
  parcaDokuman: "parca_dokuman",
  parcaIslem: "parca_islem",
  makine: "makine",
  receteVersiyon: "recete_versiyon",
  receteSatiri: "recete_satiri",
  modelParca: "model_parca",
  uretimEmriAdim: "uretim_emri_adim",
  cariBanka: "cari_banka",
  cariSube: "cari_sube",
  cariYetkili: "cari_yetkili",
  cariCrm: "cari_crm",
  cariDokuman: "cari_dokuman",
  rol: "rol",
  rolYetki: "rol_yetki",
  departman: "departman",
  kullaniciYetki: "kullanici_yetki",
  yetkiSeti: "yetki_seti",
  yetkiSetiDetay: "yetki_seti_detay",
  kullaniciCariYetki: "kullanici_cari_yetki",
  listeAyar: "liste_ayar",
  sayimSatiri: "sayim_satiri",
  sistemParametre: "sistem_parametre",
  receteGrup: "recete_grup",
  posetMalzeme: "poset_malzeme",
  parcaPaket: "parca_paket",
  parcaPaketIcerik: "parca_paket_icerik",
  alisSatiri: "alis_satiri",
  satinAlmaTalepSatiri: "satin_alma_talep_satiri",
  satinAlmaTalepSiparis: "satin_alma_talep_siparis",
  stokUretici: "stok_uretici",
  stokMusteri: "stok_musteri",
  stokDokuman: "stok_dokuman",
  sablonParca: "sablon_parca",
  sablonParcaMalzeme: "sablon_parca_malzeme",
  projeDokuman: "proje_dokuman",
  projeSatir: "proje_satir",
  projeParca: "proje_parca",
  projeParcaMalzeme: "proje_parca_malzeme",
};
