import { ProjeListe } from "@/components/proje/proje-liste";
import { getCariler, getProjeler } from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function ProjelerRoute() {
  await sayfaYetkisi("proje");
  const [projeler, cariler] = await Promise.all([getProjeler(), getCariler()]);
  return (
    <ProjeListe
      projeler={projeler}
      cariAdlari={Object.fromEntries(cariler.map((c) => [c.id, c.ad]))}
    />
  );
}
