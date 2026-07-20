import { ProductionPlan } from "@/components/production/production-plan";
import { parametreAcik } from "@/lib/db/parametre";
import { uretimVarsayilanlari } from "@/lib/uretim-varsayilan";
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
  const varsayilan = await uretimVarsayilanlari();
  const satinAlmaOner = await parametreAcik("otomatik_satinalma", true);

  return (
    <ProductionPlan
      satinAlmaOner={satinAlmaOner}
      varsayilanOncelik={varsayilan.oncelik}
      varsayilanTermin={varsayilan.termin}
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
