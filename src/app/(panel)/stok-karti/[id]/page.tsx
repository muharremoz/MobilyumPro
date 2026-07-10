import { notFound } from "next/navigation";

import { StokKartForm } from "@/components/stok-karti/stok-kart-form";
import {
  getCariler,
  getGruplar,
  getIstasyonlar,
  getMalzemeler,
  getParcalar,
  getStok,
  getTanimlar,
} from "@/lib/db/queries";

export default async function StokKartiDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // "yeni" zaten ayrı route — buraya düşmemesi gerek ama emniyet için.
  if (id === "yeni") notFound();
  const [stok, gruplar, tanimlar, parcalar, cariler, malzemeler, istasyonlar] =
    await Promise.all([
      getStok(id),
      getGruplar(),
      getTanimlar(),
      getParcalar(),
      getCariler(),
      getMalzemeler(),
      getIstasyonlar(),
    ]);
  if (!stok) notFound();
  return (
    <StokKartForm
      kart={stok.kart}
      detay={stok.detay}
      gruplar={gruplar}
      tipler={tanimlar.tip.map((t) => t.ad)}
      markalar={tanimlar.marka.map((t) => t.ad)}
      modeller={tanimlar.model.map((t) => t.ad)}
      bolumler={istasyonlar.map((i) => i.ad)}
      renkKodlari={tanimlar.renkKodu.map((t) => t.ad)}
      birimler={tanimlar.birim.map((t) => t.ad)}
      parcalar={parcalar}
      malzemeler={malzemeler}
      tedarikciler={cariler
        .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
        .map((c) => ({ id: c.id, ad: c.ad }))}
      musteriCariler={cariler
        .filter((c) => c.tip === "Müşteri" || c.tip === "Her İkisi")
        .map((c) => ({ id: c.id, ad: c.ad }))}
    />
  );
}
