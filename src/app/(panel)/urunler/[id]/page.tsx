import { notFound } from "next/navigation";

import { ModelForm } from "@/components/products/model-form";
import {
  getModeller,
  getParcalar,
  getMalzemeler,
  getGruplar,
  getTanimlar,
  getStok,
  getStokHareketleri,
} from "@/lib/db/queries";

export default async function UrunDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "yeni") notFound();
  const [urunler, parcalar, malzemeler, gruplar, tanimlar, hareketler, stok] =
    await Promise.all([
      getModeller(),
      getParcalar(),
      getMalzemeler(),
      getGruplar(),
      getTanimlar(),
      getStokHareketleri(),
      getStok(id),
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
      hareketler={hareketler}
      dokumanlar={stok?.detay.dokumanlar ?? []}
    />
  );
}
