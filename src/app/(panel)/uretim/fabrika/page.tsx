import { FabrikaPanel } from "@/components/production/fabrika-panel";
import {
  getFabrikaEmirleri,
  getIstasyonlar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

// Sahne canlı veri gösterir — her istekte taze okunur.
export const dynamic = "force-dynamic";

export default async function FabrikaRoute() {
  // "uretim-takibi" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("uretim-takibi");
  const [emirler, istasyonlar, kolonAyari, kullanicilar] = await Promise.all([
    getFabrikaEmirleri(),
    getIstasyonlar(),
    getListeKolonAyari("uretim-hatti"),
    getKullanicilar(),
  ]);
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
