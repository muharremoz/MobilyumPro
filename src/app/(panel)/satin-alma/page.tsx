import { AlisListe } from "@/components/satin-alma/alis-liste";
import {
  getAlislar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function SatinAlmaRoute() {
  // "satin-alma" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("satin-alma");
  const [alislar, kolonAyari, kullanicilar] = await Promise.all([
    getAlislar(),
    getListeKolonAyari("alislar"),
    getKullanicilar(),
  ]);
  const mevcutKullaniciId = oturum.id;
  return (
    <AlisListe
      alislar={alislar}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
