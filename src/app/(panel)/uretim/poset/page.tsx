import { PosetListe } from "@/components/production/poset-liste";
import {
  getPosetler,
  getListeKolonAyari,
  getKullanicilar,
  getModeller,
  getParcalar,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export default async function PosetRoute() {
  // "uretim-takibi" modülü liste yetkisi — sorgulardan ÖNCE, yetkisize veri çekilmesin.
  const oturum = await sayfaYetkisi("uretim-takibi");
  const [posetler, kolonAyari, kullanicilar, modeller, parcalar] =
    await Promise.all([
      getPosetler(),
      getListeKolonAyari("posetler"),
      getKullanicilar(),
      getModeller(),
      getParcalar(),
    ]);
  const mevcutKullaniciId = oturum.id;
  return (
    <PosetListe
      posetler={posetler}
      kolonAyari={kolonAyari}
      kullanicilar={kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      mevcutKullaniciId={mevcutKullaniciId}
      modeller={modeller.map((m) => ({ id: m.id, ad: m.ad }))}
      parcalar={parcalar.map((p) => ({ id: p.id, ad: p.ad }))}
    />
  );
}
