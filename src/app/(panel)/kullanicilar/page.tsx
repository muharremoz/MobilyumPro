import { KullanicilarTable } from "@/components/users/kullanicilar-table";
import {
  getDepartmanlar,
  getIstasyonlar,
  getKullanicilar,
  getListeKolonAyari,
  getRoller,
} from "@/lib/db/queries";

export default async function KullanicilarPage() {
  const [kullanicilar, roller, departmanlar, istasyonlar, kolonAyari] =
    await Promise.all([
      getKullanicilar(),
      getRoller(),
      getDepartmanlar(),
      getIstasyonlar(),
      getListeKolonAyari("kullanicilar"),
    ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
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
