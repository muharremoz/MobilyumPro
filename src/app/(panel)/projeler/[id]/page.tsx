import { notFound } from "next/navigation";

import { ProjeForm } from "@/components/proje/proje-form";
import {
  getCariler,
  getMalzemeler,
  getProjeler,
  getTanimlar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function ProjeDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaYetkisi("proje");
  const { id } = await params;
  const [projeler, malzemeler, cariler, tanimlar] = await Promise.all([
    getProjeler(),
    getMalzemeler(),
    getCariler(),
    getTanimlar(),
  ]);
  const proje = projeler.find((p) => p.id === id);
  if (!proje) notFound();
  return (
    <ProjeForm
      proje={proje}
      malzemeler={malzemeler}
      cariler={cariler.map((c) => ({ id: c.id, ad: c.ad }))}
      modulAdlari={tanimlar.modul.map((t) => t.ad)}
    />
  );
}
