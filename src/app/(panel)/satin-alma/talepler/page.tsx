import { TalepListe } from "@/components/satin-alma/talep-liste";
import {
  getTalepler,
  getCariler,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

export const dynamic = "force-dynamic";

export default async function TaleplerRoute() {
  const [talepler, cariler] = await Promise.all([
    getTalepler(),
    getCariler(),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const mevcut = await oturumZorunlu();
  return (
    <TalepListe
      talepler={talepler}
      tedarikciler={cariler
        .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
        .map((c) => ({ id: c.id, ad: c.ad }))}
      mevcutKullanici={{
        id: mevcut?.id ?? "",
        ad: mevcut?.adSoyad ?? "",
        rol: mevcut?.rol ?? "",
        departman: mevcut?.departman,
      }}
    />
  );
}
