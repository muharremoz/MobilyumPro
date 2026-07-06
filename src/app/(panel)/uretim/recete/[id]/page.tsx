import { notFound } from "next/navigation";

import { ReceteDetay } from "@/components/production/recete-detay";
import {
  getMalzemeler,
  getModeller,
  getParcalar,
  getReceteVersiyonlari,
} from "@/lib/db/queries";

export default async function ReceteDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [parcalar, malzemeler, modeller, versiyonlar] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
    getReceteVersiyonlari(),
  ]);
  const recete = parcalar.find((p) => p.id === id);
  if (!recete) notFound();

  return (
    <ReceteDetay
      recete={recete}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={versiyonlar[id] ?? []}
    />
  );
}
