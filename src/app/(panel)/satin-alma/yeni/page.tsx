import { AlisForm } from "@/components/satin-alma/alis-form";
import {
  getCariler,
  getMalzemeler,
  getDepolar,
  getSonAlisFiyatlari,
} from "@/lib/db/queries";

export default async function YeniAlisRoute() {
  const [cariler, malzemeler, depolar, sonFiyatlar] = await Promise.all([
    getCariler(),
    getMalzemeler(),
    getDepolar(),
    getSonAlisFiyatlari(),
  ]);
  // Tedarikçi seçenekleri — cari kartlardan (Tedarikçi / Her İkisi).
  const tedarikciler = cariler
    .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
    .map((c) => ({ id: c.id, ad: c.ad }));
  return (
    <AlisForm
      tedarikciler={tedarikciler}
      malzemeler={malzemeler}
      depolar={depolar.filter((d) => d.durum === "Aktif").map((d) => d.ad)}
      sonFiyatlar={sonFiyatlar}
    />
  );
}
