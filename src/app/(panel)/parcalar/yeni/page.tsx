import { ParcaForm } from "@/components/production/parca-form";
import {
  getIstasyonlar,
  getMalzemeAlisOzetleri,
  getMalzemeler,
  getModeller,
  getParcalar,
} from "@/lib/db/queries";

export default async function YeniParcaRoute() {
  const [parcalar, malzemeler, modeller, istasyonlar, alisOzetleri] =
    await Promise.all([
      getParcalar(),
      getMalzemeler(),
      getModeller(),
      getIstasyonlar(),
      getMalzemeAlisOzetleri(),
    ]);
  return (
    <ParcaForm
      recete={null}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={[]}
      istasyonlar={istasyonlar}
      alisOzetleri={alisOzetleri}
    />
  );
}
