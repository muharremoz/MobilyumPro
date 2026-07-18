import { PosetListe } from "@/components/production/poset-liste";
import {
  getPosetler,
  getListeKolonAyari,
  getKullanicilar,
  getModeller,
  getParcalar,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function PosetRoute() {
  const [posetler, kolonAyari, kullanicilar, modeller, parcalar] =
    await Promise.all([
      getPosetler(),
      getListeKolonAyari("posetler"),
      getKullanicilar(),
      getModeller(),
      getParcalar(),
    ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const mevcutKullaniciId = oturum.id;
  return (
    <PosetListe
      posetler={posetler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
      modeller={modeller.map((m) => ({ id: m.id, ad: m.ad }))}
      parcalar={parcalar.map((p) => ({ id: p.id, ad: p.ad }))}
    />
  );
}
