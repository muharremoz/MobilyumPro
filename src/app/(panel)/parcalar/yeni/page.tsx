import { ParcaForm } from "@/components/production/parca-form";
import { parametreSayi } from "@/lib/db/parametre";
import {
  getIstasyonlar,
  getMakineler,
  getMalzemeAlisOzetleri,
  getMalzemeler,
  getModeller,
  getParcalar,
  getPosetler,
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
  ] = await Promise.all([
      getParcalar(),
      getMalzemeler(),
      getModeller(),
      getIstasyonlar(),
      getMakineler(),
      getMalzemeAlisOzetleri(),
      getPosetler(),
    ]);
  const varsayilanFire = await parametreSayi("varsayilan_fire", 0);
  return (
    <ParcaForm
      varsayilanFire={varsayilanFire}
      posetler={posetler}
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
