import { CariList } from "@/components/cari/cari-list";
import {
  getCariler,
  getKullanicilar,
  getListeKolonAyari,
} from "@/lib/db/queries";

export default async function CariPage() {
  const [cariler, kolonAyari, kullanicilar] = await Promise.all([
    getCariler(),
    getListeKolonAyari("cariler"),
    getKullanicilar(),
  ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
  return (
    <CariList
      cariler={cariler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
