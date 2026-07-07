import { SiparislerTable } from "@/components/orders/siparisler-table";
import {
  getSiparisler,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function SiparislerPage() {
  const [siparisler, kolonAyari, kullanicilar] = await Promise.all([
    getSiparisler(),
    getListeKolonAyari("siparisler"),
    getKullanicilar(),
  ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
  return (
    <SiparislerTable
      siparisler={siparisler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
