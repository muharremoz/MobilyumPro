import { StokKartListe } from "@/components/stok-karti/stok-kart-liste";
import {
  getStoklar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export default async function StokKartiRoute() {
  const [stoklar, kolonAyari, kullanicilar] = await Promise.all([
    getStoklar(),
    getListeKolonAyari("stok-kartlari"),
    getKullanicilar(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
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
