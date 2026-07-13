import { StokKartForm } from "@/components/stok-karti/stok-kart-form";
import {
  getCariler,
  getGruplar,
  getIstasyonlar,
  getMalzemeler,
  getParcalar,
  getTanimlar,
} from "@/lib/db/queries";
import { sonrakiStokKodu } from "@/lib/db/actions";

export default async function YeniStokKartiRoute() {
  const [sonraki, gruplar, tanimlar, parcalar, cariler, malzemeler, istasyonlar] =
    await Promise.all([
      sonrakiStokKodu(),
      getGruplar(),
      getTanimlar(),
      getParcalar(),
      getCariler(),
      getMalzemeler(),
      getIstasyonlar(),
    ]);
  return (
    <StokKartForm
      sonrakiKod={sonraki.kod}
      sonrakiBarkod={sonraki.barkod}
      gruplar={gruplar}
      turler={tanimlar.tur.map((t) => t.ad)}
      cinsler={tanimlar.cins.map((t) => t.ad)}
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
