import { FabrikaPanel } from "@/components/production/fabrika-panel";
import {
  getFabrikaEmirleri,
  getIstasyonlar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";

// Sahne canlı veri gösterir — her istekte taze okunur.
export const dynamic = "force-dynamic";

export default async function FabrikaRoute() {
  const [emirler, istasyonlar, kolonAyari, kullanicilar] = await Promise.all([
    getFabrikaEmirleri(),
    getIstasyonlar(),
    getListeKolonAyari("uretim-hatti"),
    getKullanicilar(),
  ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
  return (
    <div className="h-full min-h-0">
      <FabrikaPanel
        emirler={emirler}
        istasyonlar={istasyonlar}
        kolonAyari={kolonAyari}
        kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
        mevcutKullaniciId={mevcutKullaniciId}
      />
    </div>
  );
}
