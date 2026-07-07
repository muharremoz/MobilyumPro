import { PosetForm } from "@/components/production/poset-form";
import { getMalzemeler } from "@/lib/db/queries";

export default async function YeniPosetRoute() {
  const malzemeler = await getMalzemeler();
  return <PosetForm poset={null} malzemeler={malzemeler} />;
}
