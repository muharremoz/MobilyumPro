import { StokKartForm } from "@/components/stok-karti/stok-kart-form";
import {
  getCariler,
  getGruplar,
  getParcalar,
  getTanimlar,
} from "@/lib/db/queries";
import { sonrakiStokKodu } from "@/lib/db/actions";

export default async function YeniStokKartiRoute() {
  const [sonrakiKod, gruplar, tanimlar, parcalar, cariler] = await Promise.all([
    sonrakiStokKodu(),
    getGruplar(),
    getTanimlar(),
    getParcalar(),
    getCariler(),
  ]);
  return (
    <StokKartForm
      sonrakiKod={sonrakiKod}
      gruplar={gruplar}
      markalar={tanimlar.marka.map((t) => t.ad)}
      birimler={tanimlar.birim.map((t) => t.ad)}
      parcalar={parcalar.map((p) => ({ id: p.id, ad: p.ad }))}
      tedarikciler={cariler
        .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
        .map((c) => ({ id: c.id, ad: c.ad }))}
      musteriCariler={cariler
        .filter((c) => c.tip === "Müşteri" || c.tip === "Her İkisi")
        .map((c) => ({ id: c.id, ad: c.ad }))}
    />
  );
}
