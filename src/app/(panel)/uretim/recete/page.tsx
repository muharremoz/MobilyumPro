import { ReceteListe } from "@/components/production/recete-liste";
import {
  getMalzemeler,
  getModeller,
  getParcalar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function ReceteRoute() {
  const [parcalar, malzemeler, modeller, kolonAyari, kullanicilar] =
    await Promise.all([
      getParcalar(),
      getMalzemeler(),
      getModeller(),
      getListeKolonAyari("receteler"),
      getKullanicilar(),
    ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const mevcutKullaniciId = oturum.id;
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
