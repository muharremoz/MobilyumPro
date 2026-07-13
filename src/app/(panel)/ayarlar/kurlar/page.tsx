import { Kurlar } from "@/components/settings/kurlar";
import { getKurlar } from "@/lib/db/queries";

export default async function KurlarRoute() {
  const kurlar = await getKurlar();
  return <Kurlar kurlar={kurlar} />;
}
