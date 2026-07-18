import { ProductionPlan } from "@/components/production/production-plan";
import {
  getModeller,
  getParcalar,
  getMalzemeler,
  getDepolar,
  getMusteriler,
  getTalepler,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function UretimPlanRoute() {
  const [
    urunler,
    parcalar,
    malzemeler,
    depolar,
    musteriler,
    talepler,
  ] = await Promise.all([
    getModeller(),
    getParcalar(),
    getMalzemeler(),
    getDepolar(),
    getMusteriler(),
    getTalepler(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const mevcut = await oturumZorunlu();

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
