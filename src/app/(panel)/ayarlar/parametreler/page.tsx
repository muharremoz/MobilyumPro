import { SistemParametreleri } from "@/components/settings/sistem-parametreleri";
import { getParametreDegerleri } from "@/lib/db/queries";

export default async function ParametrelerRoute() {
  const degerler = await getParametreDegerleri();
  return <SistemParametreleri degerler={degerler} />;
}
