import { PosetListe } from "@/components/production/poset-liste";
import { getPosetler } from "@/lib/db/queries";

export default async function PosetRoute() {
  const posetler = await getPosetler();
  return <PosetListe posetler={posetler} />;
}
