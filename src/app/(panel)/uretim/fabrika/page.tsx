import { FabrikaGorunum } from "@/components/production/fabrika-gorunum";
import { getFabrikaEmirleri, getIstasyonlar } from "@/lib/db/queries";

// Sahne canlı veri gösterir — her istekte taze okunur.
export const dynamic = "force-dynamic";

export default async function FabrikaRoute() {
  const [emirler, istasyonlar] = await Promise.all([
    getFabrikaEmirleri(),
    getIstasyonlar(),
  ]);
  return (
    <div className="h-full min-h-0">
      <FabrikaGorunum emirler={emirler} istasyonlar={istasyonlar} />
    </div>
  );
}
