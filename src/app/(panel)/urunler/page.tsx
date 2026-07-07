import { ProductsTable } from "@/components/products/products-table";
import {
  getKullanicilar,
  getListeKolonAyari,
  getModeller,
} from "@/lib/db/queries";

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
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
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
