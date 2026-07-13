import { ModelForm } from "@/components/products/model-form";
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
    <ModelForm
      parcalar={parcalar}
      malzemeler={malzemeler}
      gruplar={gruplar}
      markalar={tanimlar.marka.map((t) => t.ad)}
      renkler={tanimlar.renk.map((t) => t.ad)}
      kumaslar={tanimlar.kumas.map((t) => t.ad)}
    />
  );
}
