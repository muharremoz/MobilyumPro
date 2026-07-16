import { TalepListe } from "@/components/satin-alma/talep-liste";
import {
  getTalepler,
  getCariler,
  getKullanicilar,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function TaleplerRoute() {
  const [talepler, cariler, kullanicilar] = await Promise.all([
    getTalepler(),
    getCariler(),
    getKullanicilar(),
  ]);
  // TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı kullanılacak.
  const mevcut =
    kullanicilar.find((k) => k.rol === "Yönetici") ?? kullanicilar[0];
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
