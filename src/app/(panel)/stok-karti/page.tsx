import { StokKartListe } from "@/components/stok-karti/stok-kart-liste";
import {
  getStoklar,
  getListeKolonAyari,
  getKullanicilar,
} from "@/lib/db/queries";

export default async function StokKartiRoute() {
  const [stoklar, kolonAyari, kullanicilar] = await Promise.all([
    getStoklar(),
    getListeKolonAyari("stok-kartlari"),
    getKullanicilar(),
  ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcutKullaniciId =
    kullanicilar.find((k) => k.rol === "Yönetici")?.id ??
    kullanicilar[0]?.id ??
    "";
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
