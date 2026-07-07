import { SistemParametreleri } from "@/components/settings/sistem-parametreleri";
import { getSistemParametreleri } from "@/lib/db/queries";

export default async function ParametrelerRoute() {
  const parametreler = await getSistemParametreleri();
  return <SistemParametreleri parametreler={parametreler} />;
}
