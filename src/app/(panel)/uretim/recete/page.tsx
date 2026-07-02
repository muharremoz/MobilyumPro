import { ReceteOlusturma } from "@/components/production/recete-olusturma";
import {
  getMalzemeler,
  getModeller,
  getParcalar,
  getReceteVersiyonlari,
} from "@/lib/db/queries";

export default async function ReceteRoute() {
  const [parcalar, malzemeler, modeller, versiyonlar] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
    getReceteVersiyonlari(),
  ]);
  return (
    <ReceteOlusturma
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      versiyonlar={versiyonlar}
    />
  );
}
