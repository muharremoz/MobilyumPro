import { SablonForm } from "@/components/proje/sablon-form";
import { getIstasyonlar, getMalzemeler } from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function YeniSablonRoute() {
  await sayfaYetkisi("proje");
  const [malzemeler, istasyonlar] = await Promise.all([
    getMalzemeler(),
    getIstasyonlar(),
  ]);
  return (
    <SablonForm
      sablon={null}
      malzemeler={malzemeler}
      istasyonlar={istasyonlar.map((i) => ({ slug: i.slug, ad: i.ad }))}
    />
  );
}
