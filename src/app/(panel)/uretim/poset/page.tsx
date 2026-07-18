import { PosetListe } from "@/components/production/poset-liste";
import {
  getPosetler,
  getListeKolonAyari,
  getKullanicilar,
  getModeller,
  getParcalar,
} from "@/lib/db/queries";

export default async function PosetRoute() {
  const [posetler, kolonAyari, kullanicilar, modeller, parcalar] =
    await Promise.all([
      getPosetler(),
      getListeKolonAyari("posetler"),
      getKullanicilar(),
      getModeller(),
      getParcalar(),
    ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
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
