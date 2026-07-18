import { GenelBakis } from "@/components/pano/genel-bakis";
import { getPanoVerisi, getPanoKisayollari } from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const oturum = await oturumZorunlu();
  const [veri, kisayollar] = await Promise.all([
    getPanoVerisi(),
    getPanoKisayollari(oturum.id),
  ]);

  return (
    <GenelBakis
      veri={veri}
      kullaniciId={oturum.id}
      kisayollar={kisayollar}
      kullaniciAd={oturum.adSoyad}
      departman={oturum.departman}
      istasyon={oturum.istasyon}
    />
  );
}
