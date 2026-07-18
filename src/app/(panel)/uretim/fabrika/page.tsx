import { FabrikaPanel } from "@/components/production/fabrika-panel";
import {
  getFabrikaEmirleri,
  getIstasyonlar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

// Sahne canlı veri gösterir — her istekte taze okunur.
export const dynamic = "force-dynamic";

export default async function FabrikaRoute() {
  const [emirler, istasyonlar, kolonAyari, kullanicilar] = await Promise.all([
    getFabrikaEmirleri(),
    getIstasyonlar(),
    getListeKolonAyari("uretim-hatti"),
    getKullanicilar(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const mevcutKullaniciId = oturum.id;
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
