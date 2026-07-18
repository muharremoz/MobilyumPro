import { ProductionPlan } from "@/components/production/production-plan";
import {
  getModeller,
  getParcalar,
  getMalzemeler,
  getDepolar,
  getMusteriler,
  getKullanicilar,
  getTalepler,
} from "@/lib/db/queries";

export default async function UretimPlanRoute() {
  const [
    urunler,
    parcalar,
    malzemeler,
    depolar,
    musteriler,
    kullanicilar,
    talepler,
  ] = await Promise.all([
    getModeller(),
    getParcalar(),
    getMalzemeler(),
    getDepolar(),
    getMusteriler(),
    getKullanicilar(),
    getTalepler(),
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
      acikTalepler={talepler
        .filter((t) => t.durum !== "Reddedildi" && !t.uretimEmirleri?.length)
        .map((t) => ({ id: t.id, modeller: t.modeller }))}
      mevcutKullaniciId={mevcut?.id ?? ""}
    />
  );
}
