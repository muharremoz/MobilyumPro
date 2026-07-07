import { MaterialBags } from "@/components/inventory/material-bags";
import { getMalzemeler } from "@/lib/db/queries";

export default async function PosetRoute() {
  const malzemeler = await getMalzemeler();
  return <MaterialBags malzemeler={malzemeler} />;
}
