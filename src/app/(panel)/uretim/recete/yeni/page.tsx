import { ReceteDetay } from "@/components/production/recete-detay";
import { getMalzemeler, getModeller, getParcalar } from "@/lib/db/queries";

export default async function YeniReceteRoute() {
  const [parcalar, malzemeler, modeller] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
  ]);
  return (
    <ReceteDetay
      recete={null}
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={[]}
    />
  );
}
