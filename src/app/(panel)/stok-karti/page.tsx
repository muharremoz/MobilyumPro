import { StokKartListe } from "@/components/stok-karti/stok-kart-liste";
import {
  getStoklar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function StokKartiRoute() {
  // "stok" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("stok");
  const [stoklar, kolonAyari, kullanicilar] = await Promise.all([
    getStoklar(),
    getListeKolonAyari("stok-kartlari"),
    getKullanicilar(),
  ]);
  const mevcutKullaniciId = oturum.id;
  return (
    <StokKartListe
      // Malzeme listesi: Mamül (modeller) hariç — modeller "Model" sayfasında.
      stoklar={stoklar.filter((s) => s.grup !== "Mamül")}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
