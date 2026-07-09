import { NewProductPage } from "@/components/products/new-product-page";
import {
  getMalzemeler,
  getParcalar,
  getGruplar,
  getTanimlar,
} from "@/lib/db/queries";

export default async function YeniUrunRoute() {
  const [parcalar, malzemeler, gruplar, tanimlar] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getGruplar(),
    getTanimlar(),
  ]);
  return (
    <NewProductPage
      parcalar={parcalar}
      malzemeler={malzemeler}
      gruplar={gruplar}
      markalar={tanimlar.marka.map((t) => t.ad)}
    />
  );
}
