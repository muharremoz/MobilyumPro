import { ProductionPlan } from "@/components/production/production-plan";
import {
  getModeller,
  getParcalar,
  getMalzemeler,
  getDepolar,
  getMusteriler,
  getTalepler,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

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
  // Kimlik + "uretim-plan" modülü liste yetkisi; yetkisizse panoya döner.
  const mevcut = await sayfaYetkisi("uretim-plan");

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
