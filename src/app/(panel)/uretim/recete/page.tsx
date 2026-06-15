import { RecipePage } from "@/components/production/recipe-page";
import { getUrunler, getParcalar, getMalzemeler } from "@/lib/db/queries";

export default async function ReceteRoute() {
  const [urunler, parcalar, malzemeler] = await Promise.all([
    getUrunler(),
    getParcalar(),
    getMalzemeler(),
  ]);
  return (
    <RecipePage urunler={urunler} parcalar={parcalar} malzemeler={malzemeler} />
  );
}
