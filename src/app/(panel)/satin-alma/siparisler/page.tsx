import { SiparisListe } from "@/components/satin-alma/siparis-liste";
import { getBekleyenSiparisler } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function SiparislerRoute() {
  const siparisler = await getBekleyenSiparisler();
  return <SiparisListe siparisler={siparisler} />;
}
