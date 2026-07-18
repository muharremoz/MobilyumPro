import { CariList } from "@/components/cari/cari-list";
import {
  getCariler,
  getKullanicilar,
  getListeKolonAyari,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function CariPage() {
  // "cari" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("cari");
  const [cariler, kolonAyari, kullanicilar] = await Promise.all([
    getCariler(),
    getListeKolonAyari("cariler"),
    getKullanicilar(),
  ]);
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
