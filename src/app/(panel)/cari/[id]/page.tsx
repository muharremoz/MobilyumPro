import { notFound } from "next/navigation";

import { CariFormPage } from "@/components/cari/cari-form-page";
import {
  getCari,
  getCariDetay,
  getCariIslemleri,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function CariDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // "yeni" zaten ayrı route — buraya düşmemesi gerek ama emniyet için.
  if (id === "yeni") notFound();
  const [cari, islemler, detay, kullanicilar] = await Promise.all([
    getCari(id),
    getCariIslemleri(id),
    getCariDetay(id),
    getKullanicilar(),
  ]);
  if (!cari) notFound();
  return (
    <CariFormPage
      cari={cari}
      islemler={islemler}
      detay={detay}
      kullanicilar={kullanicilar.map((k) => k.adSoyad)}
    />
  );
}
