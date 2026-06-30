import { notFound } from "next/navigation";

import { NewProductPage } from "@/components/products/new-product-page";
import { getModeller } from "@/lib/db/queries";

export default async function UrunDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const urunler = await getModeller();
  const product = urunler.find((u) => u.id === id);
  if (!product) notFound();
  return <NewProductPage product={product} />;
}
