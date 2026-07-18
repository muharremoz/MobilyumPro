import { KullanicilarTable } from "@/components/users/kullanicilar-table";
import {
  getDepartmanlar,
  getIstasyonlar,
  getKullanicilar,
  getListeKolonAyari,
  getRoller,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function KullanicilarPage() {
  // "kullanicilar" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("kullanicilar");
  const [kullanicilar, roller, departmanlar, istasyonlar, kolonAyari] =
    await Promise.all([
      getKullanicilar(),
      getRoller(),
      getDepartmanlar(),
      getIstasyonlar(),
      getListeKolonAyari("kullanicilar"),
    ]);
  const mevcutKullaniciId = oturum.id;
  return (
    <KullanicilarTable
      kullanicilar={kullanicilar}
      roller={roller}
      departmanlar={departmanlar}
      istasyonlar={istasyonlar.map((i) => i.ad)}
      kolonAyari={kolonAyari}
      kisiSecenekleri={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
