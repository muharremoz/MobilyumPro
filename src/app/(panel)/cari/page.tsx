import { CariList } from "@/components/cari/cari-list";
import {
  getCariler,
  getKullanicilar,
  getListeKolonAyari,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function CariPage() {
  const [cariler, kolonAyari, kullanicilar] = await Promise.all([
    getCariler(),
    getListeKolonAyari("cariler"),
    getKullanicilar(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const mevcutKullaniciId = oturum.id;
  return (
    <CariList
      cariler={cariler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
