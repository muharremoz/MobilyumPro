import { notFound } from "next/navigation";

import { ParcaForm } from "@/components/production/parca-form";
import {
  getIstasyonlar,
  getMalzemeAlisOzetleri,
  getMalzemeler,
  getModeller,
  getParcaDokumanlar,
  getParcalar,
  getReceteVersiyonlari,
} from "@/lib/db/queries";

export default async function ParcaDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    parcalar,
    malzemeler,
    modeller,
    versiyonlar,
    istasyonlar,
    dokumanlar,
    alisOzetleri,
  ] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
    getReceteVersiyonlari(),
    getIstasyonlar(),
    getParcaDokumanlar(id),
    getMalzemeAlisOzetleri(),
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
      dokumanlar={dokumanlar}
      alisOzetleri={alisOzetleri}
    />
  );
}
