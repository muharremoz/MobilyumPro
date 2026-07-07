import { ProductionOrders } from "@/components/production/production-orders";
import {
  getUretimEmirleri,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function UretimEmirleriRoute() {
  const [emirler, kolonAyari, kullanicilar] = await Promise.all([
    getUretimEmirleri(),
    getListeKolonAyari("uretim-emirleri"),
    getKullanicilar(),
  ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
  return (
    <ProductionOrders
      emirler={emirler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
