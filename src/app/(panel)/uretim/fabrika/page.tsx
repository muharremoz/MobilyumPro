import { FabrikaPanel } from "@/components/production/fabrika-panel";
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
      <FabrikaPanel emirler={emirler} istasyonlar={istasyonlar} />
    </div>
  );
}
