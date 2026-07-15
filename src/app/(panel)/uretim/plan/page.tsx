import { ProductionPlan } from "@/components/production/production-plan";
import {
  getModeller,
  getParcalar,
  getMalzemeler,
  getDepolar,
  getMusteriler,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function UretimPlanRoute() {
  const [urunler, parcalar, malzemeler, depolar, musteriler, kullanicilar] =
    await Promise.all([
      getModeller(),
      getParcalar(),
      getMalzemeler(),
      getDepolar(),
      getMusteriler(),
      getKullanicilar(),
    ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcut =
    kullanicilar.find((k) => k.rol === "Yönetici") ?? kullanicilar[0];

  return (
    <ProductionPlan
      urunler={urunler}
      parcalar={parcalar}
      malzemeler={malzemeler}
      depolar={depolar}
      musteriler={musteriler}
      mevcutKullaniciId={mevcut?.id ?? ""}
    />
  );
}
