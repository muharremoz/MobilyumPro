import { ProductionPlan } from "@/components/production/production-plan";
import {
  getModeller,
  getParcalar,
  getMalzemeler,
  getDepolar,
  getMusteriler,
} from "@/lib/db/queries";

export default async function UretimPlanRoute() {
  const [urunler, parcalar, malzemeler, depolar, musteriler] =
    await Promise.all([
      getModeller(),
      getParcalar(),
      getMalzemeler(),
      getDepolar(),
      getMusteriler(),
    ]);

  return (
    <ProductionPlan
      urunler={urunler}
      parcalar={parcalar}
      malzemeler={malzemeler}
      depolar={depolar}
      musteriler={musteriler}
    />
  );
}
