import { ProductsTable } from "@/components/products/products-table";
import { uretimVarsayilanlari } from "@/lib/uretim-varsayilan";
import {
  getKullanicilar,
  getListeKolonAyari,
  getModeller,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  // "uretim-plan" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("uretim-plan");
  const { kategori = "Tümü" } = await searchParams;
  const [urunler, kolonAyari, kullanicilar] = await Promise.all([
    getModeller(),
    getListeKolonAyari("urunler"),
    getKullanicilar(),
  ]);
  const mevcutKullaniciId = oturum.id;
  const varsayilan = await uretimVarsayilanlari();
  return (
    <ProductsTable
      varsayilanOncelik={varsayilan.oncelik}
      varsayilanTermin={varsayilan.termin}
      key={kategori}
      urunler={urunler}
      initialKategori={kategori}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
