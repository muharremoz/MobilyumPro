import { GenelBakis } from "@/components/pano/genel-bakis";
import {
  getPanoVerisi,
  getDepartmanlar,
  getPanoKisayollari,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const [veri, departmanlar, kisayollar] = await Promise.all([
    getPanoVerisi(),
    getDepartmanlar(),
    getPanoKisayollari(oturum.id),
  ]);

  return (
    <GenelBakis
      veri={veri}
      kullaniciId={oturum.id}
      kisayollar={kisayollar}
      kullaniciAd={oturum.adSoyad}
      departman={oturum.departman}
      departmanlar={departmanlar}
      istasyon={oturum.istasyon}
      yonetici={oturum.yonetici}
    />
  );
}
