import { KullanicilarTable } from "@/components/users/kullanicilar-table";
import {
  getDepartmanlar,
  getIstasyonlar,
  getKullanicilar,
  getListeKolonAyari,
  getRoller,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function KullanicilarPage() {
  const [kullanicilar, roller, departmanlar, istasyonlar, kolonAyari] =
    await Promise.all([
      getKullanicilar(),
      getRoller(),
      getDepartmanlar(),
      getIstasyonlar(),
      getListeKolonAyari("kullanicilar"),
    ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
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
