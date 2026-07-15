import { notFound } from "next/navigation";

import { CariFormPage } from "@/components/cari/cari-form-page";
import {
  getCari,
  getCariDetay,
  getCariIslemleri,
  getKullanicilar,
  getMalzemeler,
  getSatinAlmaSartlari,
  getTanimlar,
} from "@/lib/db/queries";

export default async function CariDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // "yeni" zaten ayrı route — buraya düşmemesi gerek ama emniyet için.
  if (id === "yeni") notFound();
  const [cari, islemler, detay, kullanicilar, tanimlar, sartlar, malzemeler] =
    await Promise.all([
      getCari(id),
      getCariIslemleri(id),
      getCariDetay(id),
      getKullanicilar(),
      getTanimlar(),
      getSatinAlmaSartlari(),
      getMalzemeler(),
    ]);
  if (!cari) notFound();
  return (
    <CariFormPage
      cari={cari}
      islemler={islemler}
      detay={detay}
      sartlar={sartlar.filter((s) => s.cariId === cari.id)}
      malzemeler={malzemeler}
      kullanicilar={kullanicilar.map((k) => k.adSoyad)}
      adresSecenekleri={{
        ulke: tanimlar.ulke.map((t) => t.ad),
        bolge: tanimlar.bolge.map((t) => t.ad),
        sehir: tanimlar.sehir.map((t) => t.ad),
        semt: tanimlar.semt.map((t) => t.ad),
      }}
    />
  );
}
