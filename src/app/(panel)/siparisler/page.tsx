import { SiparislerTable } from "@/components/orders/siparisler-table";
import { getSiparisler } from "@/lib/db/queries";

export default async function SiparislerPage() {
  const siparisler = await getSiparisler();
  return <SiparislerTable siparisler={siparisler} />;
}
