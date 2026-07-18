import { ProductsTable } from "@/components/products/products-table";
import {
  getKullanicilar,
  getListeKolonAyari,
  getModeller,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori = "Tümü" } = await searchParams;
  const [urunler, kolonAyari, kullanicilar] = await Promise.all([
    getModeller(),
    getListeKolonAyari("urunler"),
    getKullanicilar(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const mevcutKullaniciId = oturum.id;
  return (
    <ProductsTable
      key={kategori}
      urunler={urunler}
      initialKategori={kategori}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
