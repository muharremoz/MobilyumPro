import { ReceteListe } from "@/components/production/recete-liste";
import {
  getMalzemeler,
  getModeller,
  getParcalar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function ReceteRoute() {
  // "uretim-takibi" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("uretim-takibi");
  const [parcalar, malzemeler, modeller, kolonAyari, kullanicilar] =
    await Promise.all([
      getParcalar(),
      getMalzemeler(),
      getModeller(),
      getListeKolonAyari("receteler"),
      getKullanicilar(),
    ]);
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
