import { AlisListe } from "@/components/satin-alma/alis-liste";
import {
  getAlislar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function SatinAlmaRoute() {
  const [alislar, kolonAyari, kullanicilar] = await Promise.all([
    getAlislar(),
    getListeKolonAyari("alislar"),
    getKullanicilar(),
  ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
  return (
    <AlisListe
      alislar={alislar}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
