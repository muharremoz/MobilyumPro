import { notFound } from "next/navigation";

import { NewProductPage } from "@/components/products/new-product-page";
import { getUrunler } from "@/lib/db/queries";

export default async function UrunDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "yeni") notFound();
  const urunler = await getUrunler();
  const product = urunler.find((u) => u.id === id);
  if (!product) notFound();
  return <NewProductPage product={product} />;
}
