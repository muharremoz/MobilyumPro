import { SartListe } from "@/components/satin-alma/sart-liste";
import {
  getCariler,
  getMalzemeler,
  getSatinAlmaSartlari,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function SartlarRoute() {
  const [sartlar, malzemeler, cariler] = await Promise.all([
    getSatinAlmaSartlari(),
    getMalzemeler(),
    getCariler(),
  ]);
  return (
    <SartListe
      sartlar={sartlar}
      malzemeler={malzemeler}
      tedarikciler={cariler
        .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
        .map((c) => ({ id: c.id, ad: c.ad }))}
    />
  );
}
