import { ReceteListe } from "@/components/production/recete-liste";
import {
  getMalzemeler,
  getModeller,
  getParcalar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function ReceteRoute() {
  const [parcalar, malzemeler, modeller, kolonAyari, kullanicilar] =
    await Promise.all([
      getParcalar(),
      getMalzemeler(),
      getModeller(),
      getListeKolonAyari("receteler"),
      getKullanicilar(),
    ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
  return (
    <ReceteListe
      parcalar={parcalar}
      malzemeler={malzemeler}
      modeller={modeller}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
