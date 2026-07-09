import { CariFormPage } from "@/components/cari/cari-form-page";
import { getKullanicilar, getTanimlar } from "@/lib/db/queries";

export default async function YeniCariRoute() {
  const [kullanicilar, tanimlar] = await Promise.all([
    getKullanicilar(),
    getTanimlar(),
  ]);
  return (
    <CariFormPage
      kullanicilar={kullanicilar.map((k) => k.adSoyad)}
      adresSecenekleri={{
        ulke: tanimlar.ulke.map((t) => t.ad),
        bolge: tanimlar.bolge.map((t) => t.ad),
        sehir: tanimlar.sehir.map((t) => t.ad),
        semt: tanimlar.semt.map((t) => t.ad),
      }}
    />
  );
}
