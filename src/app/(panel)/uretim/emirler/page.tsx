import { ProductionOrders } from "@/components/production/production-orders";
import {
  getUretimEmirleri,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function UretimEmirleriRoute() {
  const [emirler, kolonAyari, kullanicilar] = await Promise.all([
    getUretimEmirleri(),
    getListeKolonAyari("uretim-emirleri"),
    getKullanicilar(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const mevcutKullaniciId = oturum.id;
  return (
    <ProductionOrders
      emirler={emirler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
