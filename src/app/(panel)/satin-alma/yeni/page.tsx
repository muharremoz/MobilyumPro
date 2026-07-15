import { AlisForm } from "@/components/satin-alma/alis-form";
import {
  getCariler,
  getMalzemeler,
  getDepolar,
  getSonAlisFiyatlari,
  getKurlar,
  getTalep,
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
  searchParams: Promise<{ kalem?: string; talep?: string }>;
}) {
  const { kalem, talep } = await searchParams;
  const [cariler, malzemeler, depolar, sonFiyatlar, kurlar, talepKaydi] =
    await Promise.all([
      getCariler(),
      getMalzemeler(),
      getDepolar(),
      getSonAlisFiyatlari(),
      getKurlar(),
      talep ? getTalep(talep) : Promise.resolve(null),
    ]);
  // Tedarikçi seçenekleri — cari kartlardan (Tedarikçi / Her İkisi).
  const tedarikciler = cariler
    .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
    .map((c) => ({ id: c.id, ad: c.ad }));
  // Talepten geliyorsa kalemler talepten — yalnız onaylanmış/tedarikteki
  // talep, KALAN miktarlarla (kısmi mal kabuller düşülür).
  const talepAktif =
    talepKaydi &&
    (talepKaydi.durum === "Onaylandı" ||
      talepKaydi.durum === "Tedarik Sürecinde")
      ? talepKaydi
      : null;
  const baslangicKalemler = talepAktif
    ? talepAktif.satirlar
        .map((s) => ({
          malzemeId: s.malzemeId,
          miktar: Math.max(0, s.miktar - s.tedarikEdilen),
        }))
        .filter((s) => s.miktar > 0)
    : kalemAyristir(kalem);
  return (
    <AlisForm
      tedarikciler={tedarikciler}
      malzemeler={malzemeler}
      depolar={depolar.filter((d) => d.durum === "Aktif").map((d) => d.ad)}
      sonFiyatlar={sonFiyatlar}
      baslangicKalemler={baslangicKalemler}
      kurlar={kurlar}
      talepId={talepAktif?.id}
    />
  );
}
