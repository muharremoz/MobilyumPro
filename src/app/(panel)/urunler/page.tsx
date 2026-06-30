import { ProductsTable } from "@/components/products/products-table";
import { getModeller } from "@/lib/db/queries";

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori = "Tümü" } = await searchParams;
  const urunler = await getModeller();
  return (
    <ProductsTable
      key={kategori}
      urunler={urunler}
      initialKategori={kategori}
    />
  );
}
