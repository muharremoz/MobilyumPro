import { notFound } from "next/navigation";

import { NewProductPage } from "@/components/products/new-product-page";
import { urunler } from "@/lib/data";

export default async function UrunDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = urunler.find((u) => u.id === id);
  if (!product) notFound();
  return <NewProductPage product={product} />;
}
