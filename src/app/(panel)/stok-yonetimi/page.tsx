import { InventoryPage } from "@/components/inventory/inventory-page";
import {
  getModeller,
  getMalzemeler,
  getParcalar,
  getDepolar,
  getStokHareketleri,
  getListeKolonAyari,
  getKullanicilar,
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
    kullanicilar,
  ] = await Promise.all([
    getModeller(),
    getMalzemeler(),
    getParcalar(),
    getDepolar(),
    getStokHareketleri(),
    getListeKolonAyari("tanimlamalar"),
    getListeKolonAyari("malzemeler"),
    getKullanicilar(),
  ]);
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
      kolonAyarlari={{ tanimlamalar: tanimAyar, malzemeler: malzemeAyar }}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
