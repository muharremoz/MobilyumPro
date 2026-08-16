import { ParcaForm } from "@/components/production/parca-form";
import { parametreSayi } from "@/lib/db/parametre";
import {
  getCariler,
  getIstasyonlar,
  getMakineler,
  getMalzemeAlisOzetleri,
  getMalzemeler,
  getModeller,
  getParcalar,
  getPosetler,
  getGruplar,
  getTanimlar,
} from "@/lib/db/queries";

export default async function YeniParcaRoute() {
  const [
    parcalar,
    malzemeler,
    modeller,
    istasyonlar,
    makineler,
    alisOzetleri,
    posetler,
    gruplar,
    tanimlar,
    cariler,
  ] = await Promise.all([
      getParcalar(),
      getMalzemeler(),
      getModeller(),
      getIstasyonlar(),
      getMakineler(),
      getMalzemeAlisOzetleri(),
      getPosetler(),
      getGruplar(),
      getTanimlar(),
      getCariler(),
    ]);
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
      recete={null}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={[]}
      istasyonlar={istasyonlar}
      makineler={makineler}
      alisOzetleri={alisOzetleri}
    />
  );
}
