import { notFound } from "next/navigation";

import { ParcaForm } from "@/components/production/parca-form";
import { parametreSayi } from "@/lib/db/parametre";
import {
  getCariler,
  getIstasyonlar,
  getMakineler,
  getMalzemeAlisOzetleri,
  getMalzemeler,
  getModeller,
  getParcaDokumanlar,
  getParcalar,
  getReceteVersiyonlari,
  getPosetler,
  getGruplar,
  getTanimlar,
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
    gruplar,
    tanimlar,
    cariler,
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
    getGruplar(),
    getTanimlar(),
    getCariler(),
  ]);
  const recete = parcalar.find((p) => p.id === id);
  if (!recete) notFound();

  const varsayilanFire = await parametreSayi("varsayilan_fire", 0);
  const tutkalKgMetre = await parametreSayi("tutkal_kg_metre", 0.007);
  return (
    <ParcaForm
      varsayilanFire={varsayilanFire}
      tutkalKgMetre={tutkalKgMetre}
      posetler={posetler}
      stokGruplari={gruplar}
      birimler={tanimlar.birim.map((t) => t.ad)}
      parcaAdlari={tanimlar.parca.map((t) => t.ad)}
      stokTanimlari={{
        cinsler: tanimlar.cins.map((t) => t.ad),
        tipler: tanimlar.tip.map((t) => t.ad),
        markalar: tanimlar.marka.map((t) => t.ad),
        modeller: tanimlar.model.map((t) => t.ad),
        bolumler: istasyonlar.map((i) => i.ad),
        renkKodlari: tanimlar.renkKodu.map((t) => t.ad),
        renkler: tanimlar.renk.map((t) => ({ ad: t.ad, cinsler: t.cinsler })),
        tedarikciler: cariler
          .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
          .map((c) => ({ id: c.id, ad: c.ad })),
        musteriCariler: cariler
          .filter((c) => c.tip === "Müşteri" || c.tip === "Her İkisi")
          .map((c) => ({ id: c.id, ad: c.ad })),
      }}
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
