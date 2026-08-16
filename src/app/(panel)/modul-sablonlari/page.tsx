import { SablonListe } from "@/components/proje/sablon-liste";
import { getModulSablonlari } from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function ModulSablonlariRoute() {
  await sayfaYetkisi("proje");
  const sablonlar = await getModulSablonlari();
  return <SablonListe sablonlar={sablonlar} />;
}
