import { notFound } from "next/navigation";

import { ModelForm } from "@/components/products/model-form";
import {
  getMalzemeler,
  getModeller,
  getParcalar,
  getGruplar,
  getTanimlar,
} from "@/lib/db/queries";

export default async function UrunDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [urunler, parcalar, malzemeler, gruplar, tanimlar] = await Promise.all([
    getModeller(),
    getParcalar(),
    getMalzemeler(),
    getGruplar(),
    getTanimlar(),
  ]);
  const product = urunler.find((u) => u.id === id);
  if (!product) notFound();
  return (
    <ModelForm
      product={product}
      parcalar={parcalar}
      malzemeler={malzemeler}
      gruplar={gruplar}
      markalar={tanimlar.marka.map((t) => t.ad)}
      renkler={tanimlar.renk.map((t) => t.ad)}
      kumaslar={tanimlar.kumas.map((t) => t.ad)}
    />
  );
}
