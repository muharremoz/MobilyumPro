import { PosetForm } from "@/components/production/poset-form";
import { getMalzemeler, getModeller, getParcalar } from "@/lib/db/queries";

export default async function YeniPosetRoute() {
  const [malzemeler, modeller, parcalar] = await Promise.all([
    getMalzemeler(),
    getModeller(),
    getParcalar(),
  ]);
  return (
    <PosetForm
      poset={null}
      malzemeler={malzemeler}
      modeller={modeller}
      parcalar={parcalar}
    />
  );
}
