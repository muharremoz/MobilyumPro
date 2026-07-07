import { ProductsTable } from "@/components/products/products-table";
import { getListeKolonlari, getModeller } from "@/lib/db/queries";

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori = "Tümü" } = await searchParams;
  const [urunler, ekKolonlar] = await Promise.all([
    getModeller(),
    getListeKolonlari("urunler"),
  ]);
  return (
    <ProductsTable
      key={kategori}
      urunler={urunler}
      initialKategori={kategori}
      ekKolonlar={ekKolonlar}
    />
  );
}
