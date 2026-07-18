import { AlisListe } from "@/components/satin-alma/alis-liste";
import {
  getAlislar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function SatinAlmaRoute() {
  const [alislar, kolonAyari, kullanicilar] = await Promise.all([
    getAlislar(),
    getListeKolonAyari("alislar"),
    getKullanicilar(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
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
