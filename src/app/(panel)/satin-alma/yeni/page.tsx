import { AlisForm } from "@/components/satin-alma/alis-form";
import {
  getCariler,
  getMalzemeler,
  getDepolar,
  getSonAlisFiyatlari,
  getKurlar,
  getSatinAlmaSartlari,
  getBekleyenSiparisler,
} from "@/lib/db/queries";
import { oturumZorunlu } from "@/lib/oturum";

/**
 * "kalem" parametresi (üretim planından gelir): "malzemeId:miktar,..."
 * biçiminde; satın alma satırlarını önceden doldurmak için ayrıştırılır.
 */
function kalemAyristir(raw?: string): { malzemeId: string; miktar: number }[] {
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
  searchParams: Promise<{
    kalem?: string;
    /** "talep": form talep hazırlığı olarak açılır (alış değil talep oluşturur). */
    mod?: string;
    modeller?: string;
    depo?: string;
    musteri?: string;
    termin?: string;
    oncelik?: string;
    /** Bir tedarikçiden bekleyen tüm siparişleri faturaya doldur. */
    siparisFirma?: string;
    /** Cari karttan "Yeni Alış" — fişin tedarikçisini önceden seçer. */
    firma?: string;
  }>;
}) {
  const {
    kalem,
    mod,
    modeller,
    depo,
    musteri,
    termin,
    oncelik,
    siparisFirma,
    firma,
  } = await searchParams;
  const [
    cariler,
    malzemeler,
    depolar,
    sonFiyatlar,
    kurlar,
    sartlar,
    bekleyenSiparisler,
  ] = await Promise.all([
    getCariler(),
    getMalzemeler(),
    getDepolar(),
    getSonAlisFiyatlari(),
    getKurlar(),
    getSatinAlmaSartlari(),
    siparisFirma ? getBekleyenSiparisler() : Promise.resolve([]),
  ]);
  // Kimlik oturumdan gelir; layout guard'ı zaten girişi zorunlu kılıyor.
  const mevcut = await oturumZorunlu();
  // Tedarikçi seçenekleri — cari kartlardan (Tedarikçi / Her İkisi).
  const tedarikciler = cariler
    .filter((c) => c.tip === "Tedarikçi" || c.tip === "Her İkisi")
    .map((c) => ({ id: c.id, ad: c.ad }));
  // Fatura kalemleri firma bazlı gelir: o firmadan bekleyen tüm siparişler
  // (aynı malzeme birleştirilir), kalan (sipariş − tedarik) miktarıyla.
  const firmaKalemler = siparisFirma
    ? (() => {
        const grup = new Map<
          string,
          { malzemeId: string; miktar: number; cariId: string; fiyat?: number }
        >();
        for (const b of bekleyenSiparisler) {
          if (b.cariId !== siparisFirma) continue;
          const mev = grup.get(b.malzemeId);
          if (mev) mev.miktar += b.kalan;
          else
            grup.set(b.malzemeId, {
              malzemeId: b.malzemeId,
              miktar: b.kalan,
              cariId: b.cariId,
              fiyat: b.siparisFiyat,
            });
        }
        return [...grup.values()].filter((k) => k.miktar > 0);
      })()
    : null;
  const baslangicKalemler = firmaKalemler ?? kalemAyristir(kalem);
  return (
    <AlisForm
      tedarikciler={tedarikciler}
      malzemeler={malzemeler}
      depolar={depolar.filter((d) => d.durum === "Aktif").map((d) => d.ad)}
      sonFiyatlar={sonFiyatlar}
      baslangicKalemler={baslangicKalemler}
      kurlar={kurlar}
      mod={mod === "talep" ? "talep" : "alis"}
      talepModeller={modeller}
      talepUretim={{ musteri, termin, oncelik }}
      baslangicDepo={depo}
      baslangicFirma={siparisFirma ?? firma}
      mevcutKullaniciId={mevcut?.id ?? ""}
      sartlar={sartlar}
    />
  );
}
