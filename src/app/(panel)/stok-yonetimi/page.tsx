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

export default async function StokYonetimiPage({
  searchParams,
}: {
  searchParams: Promise<{ bolum?: string }>;
}) {
  const { bolum = "durum" } = await searchParams;
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
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
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
