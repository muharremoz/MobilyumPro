import { ProjeForm } from "@/components/proje/proje-form";
import { getCariler, getMalzemeler, getTanimlar } from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function YeniProjeRoute() {
  await sayfaYetkisi("proje");
  const [malzemeler, cariler, tanimlar] = await Promise.all([
    getMalzemeler(),
    getCariler(),
    getTanimlar(),
  ]);
  return (
    <ProjeForm
      proje={null}
      malzemeler={malzemeler}
      cariler={cariler.map((c) => ({ id: c.id, ad: c.ad }))}
      modulAdlari={tanimlar.parca.map((t) => t.ad)}
    />
  );
}
