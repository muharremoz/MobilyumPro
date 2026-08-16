import { notFound } from "next/navigation";

import { SablonForm } from "@/components/proje/sablon-form";
import {
  getIstasyonlar,
  getMalzemeler,
  getModulSablonlari,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function SablonDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaYetkisi("proje");
  const { id } = await params;
  const [sablonlar, malzemeler, istasyonlar] = await Promise.all([
    getModulSablonlari(),
    getMalzemeler(),
    getIstasyonlar(),
  ]);
  const sablon = sablonlar.find((s) => s.id === id);
  if (!sablon) notFound();
  return (
    <SablonForm
      sablon={sablon}
      malzemeler={malzemeler}
      istasyonlar={istasyonlar.map((i) => ({ slug: i.slug, ad: i.ad }))}
    />
  );
}
