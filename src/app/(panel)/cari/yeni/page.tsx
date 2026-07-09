import { CariFormPage } from "@/components/cari/cari-form-page";
import { getKullanicilar } from "@/lib/db/queries";

export default async function YeniCariRoute() {
  const kullanicilar = await getKullanicilar();
  return (
    <CariFormPage kullanicilar={kullanicilar.map((k) => k.adSoyad)} />
  );
}
