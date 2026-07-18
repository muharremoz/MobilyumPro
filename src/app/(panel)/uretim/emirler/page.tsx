import { ProductionOrders } from "@/components/production/production-orders";
import {
  getUretimEmirleri,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function UretimEmirleriRoute() {
  // "uretim-takibi" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("uretim-takibi");
  const [emirler, kolonAyari, kullanicilar] = await Promise.all([
    getUretimEmirleri(),
    getListeKolonAyari("uretim-emirleri"),
    getKullanicilar(),
  ]);
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
