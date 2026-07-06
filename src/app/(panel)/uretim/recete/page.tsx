import { ReceteListe } from "@/components/production/recete-liste";
import { getMalzemeler, getModeller, getParcalar } from "@/lib/db/queries";

export default async function ReceteRoute() {
  const [parcalar, malzemeler, modeller] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
  ]);
  return (
    <ReceteListe
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
    />
  );
}
