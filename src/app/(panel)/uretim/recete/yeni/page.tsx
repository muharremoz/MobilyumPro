import { ReceteDetay } from "@/components/production/recete-detay";
import {
  getIstasyonlar,
  getMalzemeler,
  getModeller,
  getParcalar,
} from "@/lib/db/queries";

export default async function YeniReceteRoute() {
  const [parcalar, malzemeler, modeller, istasyonlar] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
    getIstasyonlar(),
  ]);
  return (
    <ReceteDetay
      recete={null}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={[]}
      istasyonlar={istasyonlar}
    />
  );
}
