import { FabrikaGorunum } from "@/components/production/fabrika-gorunum";
import { getFabrikaEmirleri } from "@/lib/db/queries";

// Sahne canlı veri gösterir — her istekte taze okunur.
export const dynamic = "force-dynamic";

export default async function FabrikaRoute() {
  const emirler = await getFabrikaEmirleri();
  return (
    <div className="h-full min-h-0">
      <FabrikaGorunum emirler={emirler} />
    </div>
  );
}
