import { ParcaForm } from "@/components/production/parca-form";
import {
  getIstasyonlar,
  getMalzemeler,
  getModeller,
  getParcalar,
} from "@/lib/db/queries";

export default async function YeniParcaRoute() {
  const [parcalar, malzemeler, modeller, istasyonlar] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
    getIstasyonlar(),
  ]);
  return (
    <ParcaForm
      recete={null}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={[]}
      istasyonlar={istasyonlar}
    />
  );
}
