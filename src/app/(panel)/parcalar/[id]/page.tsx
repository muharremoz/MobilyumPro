import { notFound } from "next/navigation";

import { ParcaForm } from "@/components/production/parca-form";
import { parametreSayi } from "@/lib/db/parametre";
import {
  getIstasyonlar,
  getMakineler,
  getMalzemeAlisOzetleri,
  getMalzemeler,
  getModeller,
  getParcaDokumanlar,
  getParcalar,
  getReceteVersiyonlari,
  getPosetler,
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
    makineler,
    dokumanlar,
    alisOzetleri,
    posetler,
  ] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
    getReceteVersiyonlari(),
    getIstasyonlar(),
    getMakineler(),
    getParcaDokumanlar(id),
    getMalzemeAlisOzetleri(),
    getPosetler(),
  ]);
  const recete = parcalar.find((p) => p.id === id);
  if (!recete) notFound();

  const varsayilanFire = await parametreSayi("varsayilan_fire", 0);
  return (
    <ParcaForm
      varsayilanFire={varsayilanFire}
      posetler={posetler}
      recete={recete}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={versiyonlar[id] ?? []}
      istasyonlar={istasyonlar}
      makineler={makineler}
      dokumanlar={dokumanlar}
      alisOzetleri={alisOzetleri}
    />
  );
}
