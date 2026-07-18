import { GenelBakis } from "@/components/pano/genel-bakis";
import {
  getPanoVerisi,
  getKullanicilar,
  getDepartmanlar,
  getPanoKisayollari,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  const [veri, kullanicilar, departmanlar] = await Promise.all([
    getPanoVerisi(),
    getKullanicilar(),
    getDepartmanlar(),
  ]);
  // TODO: oturum altyapısı gelince giriş yapan kullanıcı kullanılacak.
  const mevcut =
    kullanicilar.find((k) => k.rol === "Yönetici") ?? kullanicilar[0];
  // Kısayollar kullanıcı + departman bazında; kaydı yoksa varsayılan kullanılır.
  const kisayollar = mevcut ? await getPanoKisayollari(mevcut.id) : {};

  return (
    <GenelBakis
      veri={veri}
      kullaniciId={mevcut?.id}
      kisayollar={kisayollar}
      kullaniciAd={mevcut?.adSoyad ?? "Kullanıcı"}
      departman={mevcut?.departman}
      departmanlar={departmanlar}
      istasyon={mevcut?.istasyon}
      yonetici={mevcut?.rol === "Yönetici"}
    />
  );
}
