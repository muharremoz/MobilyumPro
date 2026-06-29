import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/products/product-detail-page";
import { urunler } from "@/lib/data";

export default async function UrunDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = urunler.find((u) => u.id === id);
  if (!product) notFound();
  return <ProductDetailPage product={product} />;
}
