import { SiparislerTable } from "@/components/orders/siparisler-table";
import {
  getSiparisler,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function SiparislerPage() {
  const [siparisler, kolonAyari, kullanicilar] = await Promise.all([
    getSiparisler(),
    getListeKolonAyari("siparisler"),
    getKullanicilar(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const mevcutKullaniciId = oturum.id;
  return (
    <SiparislerTable
      siparisler={siparisler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
