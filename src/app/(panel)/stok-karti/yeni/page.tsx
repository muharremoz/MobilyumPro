import { StokKartForm } from "@/components/stok-karti/stok-kart-form";
import {
  getCariler,
  getGruplar,
  getMalzemeler,
  getParcalar,
  getTanimlar,
} from "@/lib/db/queries";
import { sonrakiStokKodu } from "@/lib/db/actions";

export default async function YeniStokKartiRoute() {
  const [sonrakiKod, gruplar, tanimlar, parcalar, cariler, malzemeler] =
    await Promise.all([
      sonrakiStokKodu(),
      getGruplar(),
      getTanimlar(),
      getParcalar(),
      getCariler(),
      getMalzemeler(),
    ]);
  return (
    <StokKartForm
      sonrakiKod={sonrakiKod}
      gruplar={gruplar}
      tipler={tanimlar.tip.map((t) => t.ad)}
      markalar={tanimlar.marka.map((t) => t.ad)}
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
