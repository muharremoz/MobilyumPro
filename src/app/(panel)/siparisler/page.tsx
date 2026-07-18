import { SiparislerTable } from "@/components/orders/siparisler-table";
import {
  getSiparisler,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function SiparislerPage() {
  // "siparis" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("siparis");
  const [siparisler, kolonAyari, kullanicilar] = await Promise.all([
    getSiparisler(),
    getListeKolonAyari("siparisler"),
    getKullanicilar(),
  ]);
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
