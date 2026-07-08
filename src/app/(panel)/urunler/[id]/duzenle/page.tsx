import { notFound } from "next/navigation";

import { NewProductPage } from "@/components/products/new-product-page";
import { getMalzemeler, getModeller, getParcalar } from "@/lib/db/queries";
import { modelTanimSecenekleri } from "@/lib/model-tanimlar";

export default async function UrunDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [urunler, parcalar, malzemeler] = await Promise.all([
    getModeller(),
    getParcalar(),
    getMalzemeler(),
  ]);
  const product = urunler.find((u) => u.id === id);
  if (!product) notFound();
  const { kategoriler, markalar } = modelTanimSecenekleri(urunler);
  return (
    <NewProductPage
      product={product}
      parcalar={parcalar}
      malzemeler={malzemeler}
      kategoriler={kategoriler}
      markalar={markalar}
    />
  );
}
