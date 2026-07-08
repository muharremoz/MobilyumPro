import { NewProductPage } from "@/components/products/new-product-page";
import { getMalzemeler, getModeller, getParcalar } from "@/lib/db/queries";
import { modelTanimSecenekleri } from "@/lib/model-tanimlar";

export default async function YeniUrunRoute() {
  const [parcalar, malzemeler, modeller] = await Promise.all([
    getParcalar(),
    getMalzemeler(),
    getModeller(),
  ]);
  const { kategoriler, markalar } = modelTanimSecenekleri(modeller);
  return (
    <NewProductPage
      parcalar={parcalar}
      malzemeler={malzemeler}
      kategoriler={kategoriler}
      markalar={markalar}
    />
  );
}
