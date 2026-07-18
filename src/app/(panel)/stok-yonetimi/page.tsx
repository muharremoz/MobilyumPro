import { InventoryPage } from "@/components/inventory/inventory-page";
import {
  getModeller,
  getMalzemeler,
  getParcalar,
  getDepolar,
  getStokHareketleri,
  getListeKolonAyari,
  getKullanicilar,
  getGruplar,
  getTanimlar,
  getCariler,
  getIstasyonlar,
  getMakineler,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function StokYonetimiPage({
  searchParams,
}: {
  searchParams: Promise<{ bolum?: string }>;
}) {
  const { bolum = "durum" } = await searchParams;
  // Bu sayfa iki modüle hizmet ediyor: tanım bölümleri "tanimlamalar",
  // gerisi "stok". Tek modülle korunsaydı biri diğerinin yetkisini gerektirirdi.
  const TANIM_BOLUMLERI = [
    "gruplar",
    "markalar",
    "koleksiyonlar",
    "renkler",
    "kumaslar",
    "birimler",
    "istasyonlar",
  ];
  const modul = TANIM_BOLUMLERI.includes(bolum) ? "tanimlamalar" : "stok";
  const [
    urunler,
    malzemeler,
    parcalar,
    depolar,
    hareketler,
    tanimAyar,
    malzemeAyar,
    parcaAyar,
    depoAyar,
    hareketAyar,
    stokDurumAyar,
    sayimAyar,
    kullanicilar,
    gruplar,
    tanimlar,
    cariler,
    istasyonlar,
    makineler,
  ] = await Promise.all([
    getModeller(),
    getMalzemeler(),
    getParcalar(),
    getDepolar(),
    getStokHareketleri(),
    getListeKolonAyari("tanimlamalar"),
    getListeKolonAyari("malzemeler"),
    getListeKolonAyari("parcalar"),
    getListeKolonAyari("depolar"),
    getListeKolonAyari("stok-hareketleri"),
    getListeKolonAyari("stok-durumu"),
    getListeKolonAyari("sayim"),
    getKullanicilar(),
    getGruplar(),
    getTanimlar(),
    getCariler(),
    getIstasyonlar(),
    getMakineler(),
  ]);
  // Malzeme formundaki tedarikçi seçenekleri — cari kartlardan.
  const tedarikciler = cariler
    .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
    .map((c) => c.ad);
  // Kimlik + modül liste yetkisi; yetkisizse panoya döner.
  const oturum = await sayfaYetkisi(modul);
  const mevcutKullaniciId = oturum.id;
  return (
    <InventoryPage
      bolum={bolum}
      urunler={urunler}
      malzemeler={malzemeler}
      parcalar={parcalar}
      depolar={depolar}
      hareketler={hareketler}
      kolonAyarlari={{
        tanimlamalar: tanimAyar,
        malzemeler: malzemeAyar,
        parcalar: parcaAyar,
        depolar: depoAyar,
        "stok-hareketleri": hareketAyar,
        "stok-durumu": stokDurumAyar,
        sayim: sayimAyar,
      }}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
      gruplar={gruplar}
      tanimlar={tanimlar}
      tedarikciler={tedarikciler}
      istasyonlar={istasyonlar}
      makineler={makineler}
    />
  );
}
