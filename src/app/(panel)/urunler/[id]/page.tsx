import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/products/product-detail-page";
import { getUrunler } from "@/lib/db/queries";

export default async function UrunDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "yeni") notFound();
  const urunler = await getUrunler();
  const product = urunler.find((u) => u.id === id);
  if (!product) notFound();
  return <ProductDetailPage product={product} />;
}
