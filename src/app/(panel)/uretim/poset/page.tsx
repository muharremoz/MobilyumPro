import { PosetListe } from "@/components/production/poset-liste";
import {
  getPosetler,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function PosetRoute() {
  const [posetler, kolonAyari, kullanicilar] = await Promise.all([
    getPosetler(),
    getListeKolonAyari("posetler"),
    getKullanicilar(),
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
    />
  );
}
