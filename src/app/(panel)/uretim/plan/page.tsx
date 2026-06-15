import { ProductionPlan } from "@/components/production/production-plan";
import {
  getUrunler,
  getParcalar,
  getMalzemeler,
  getDepolar,
  getMusteriler,
} from "@/lib/db/queries";

export default async function UretimPlanRoute() {
  const [urunler, parcalar, malzemeler, depolar, musteriler] =
    await Promise.all([
      getUrunler(),
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
