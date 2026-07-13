import { notFound } from "next/navigation";

import { ParcaForm } from "@/components/production/parca-form";
import {
  getIstasyonlar,
  getMalzemeler,
  getModeller,
  getParcalar,
  getReceteVersiyonlari,
} from "@/lib/db/queries";

export default async function ParcaDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [parcalar, malzemeler, modeller, versiyonlar, istasyonlar] =
    await Promise.all([
      getParcalar(),
      getMalzemeler(),
      getModeller(),
      getReceteVersiyonlari(),
      getIstasyonlar(),
    ]);
  const recete = parcalar.find((p) => p.id === id);
  if (!recete) notFound();

  return (
    <ParcaForm
      recete={recete}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={versiyonlar[id] ?? []}
      istasyonlar={istasyonlar}
    />
  );
}
