import { ProductionOrders } from "@/components/production/production-orders";
import { getUretimEmirleri } from "@/lib/db/queries";

export default async function UretimEmirleriRoute() {
  const emirler = await getUretimEmirleri();
  return <ProductionOrders emirler={emirler} />;
}
