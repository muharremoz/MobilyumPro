import { AlisForm } from "@/components/satin-alma/alis-form";
import {
  getCariler,
  getMalzemeler,
  getDepolar,
  getSonAlisFiyatlari,
} from "@/lib/db/queries";

/**
 * "kalem" parametresi (üretim planından gelir): "malzemeId:miktar,..."
 * biçiminde; satın alma satırlarını önceden doldurmak için ayrıştırılır.
 */
function kalemAyristir(
  raw?: string,
): { malzemeId: string; miktar: number }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => {
      const [id, m] = p.split(":");
      return { malzemeId: (id ?? "").trim(), miktar: Number(m) || 1 };
    })
    .filter((k) => k.malzemeId);
}

export default async function YeniAlisRoute({
  searchParams,
}: {
  searchParams: Promise<{ kalem?: string }>;
}) {
  const { kalem } = await searchParams;
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
      baslangicKalemler={kalemAyristir(kalem)}
    />
  );
}
