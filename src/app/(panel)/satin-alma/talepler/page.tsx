import { TalepListe } from "@/components/satin-alma/talep-liste";
import {
  getTalepler,
  getCariler,
} from "@/lib/db/queries";
import { sayfaYetkisi } from "@/lib/yetki-sunucu";

export const dynamic = "force-dynamic";

export default async function TaleplerRoute() {
  const [talepler, cariler] = await Promise.all([
    getTalepler(),
    getCariler(),
  ]);
  // Kimlik + "satin-alma" modülü liste yetkisi; yetkisizse panoya döner.
  const mevcut = await sayfaYetkisi("satin-alma");
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
