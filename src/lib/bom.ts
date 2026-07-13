// BOM (Bill of Materials) yardımcıları — bir parça/modelin tüm alt parçalarını
// recursive açıp toplam malzeme dökümünü çıkarır.

import {
  type Parca,
  type Malzeme,
  type ParcaSatiri,
  type ReceteSatiri,
} from "@/lib/data";
import { ISTASYONLAR } from "@/lib/fabrika";

/** Bölüm metnini (slug ya da ad) istasyon slug'ına çevir. */
function bolumSlug(bolum: string | undefined): string | undefined {
  if (!bolum) return undefined;
  const i = ISTASYONLAR.find((x) => x.slug === bolum || x.ad === bolum);
  return i?.slug;
}

export type MalzemeIhtiyac = {
  malzeme: Malzeme;
  toplamMiktar: number;
  toplamFiyat: number;
};

export type ParcaAcilim = {
  parca: Parca;
  miktar: number;
  /** Bu parça için recursive malzeme listesi (alt-parçalar dahil). */
  malzemeler: Map<string, number>;
};

/** Tek bir parçayı miktar*1 olarak recursive aç — Map<malzemeId, miktar>. */
export function flattenParca(
  parcaId: string,
  miktar: number,
  parcalar: Parca[],
  out: Map<string, number> = new Map(),
  ziyaret: Set<string> = new Set(),
): Map<string, number> {
  if (ziyaret.has(parcaId)) {
    // Döngü koruması — bir parça zaten açılıyor.
    return out;
  }
  const parca = parcalar.find((p) => p.id === parcaId);
  if (!parca) return out;
  ziyaret.add(parcaId);

  for (const satir of parca.recete) {
    const carpan = satir.miktar * miktar;
    if (satir.bilesen.tip === "malzeme") {
      out.set(satir.bilesen.ref, (out.get(satir.bilesen.ref) ?? 0) + carpan);
    } else {
      flattenParca(satir.bilesen.ref, carpan, parcalar, out, ziyaret);
    }
  }

  ziyaret.delete(parcaId);
  return out;
}

/** Bir model (ürünün) parça listesinden tüm malzeme ihtiyacını çıkar. */
export function modelMalzemeIhtiyaci(
  parcaSatirlari: ParcaSatiri[],
  parcalar: Parca[],
  malzemeler: Malzeme[],
): MalzemeIhtiyac[] {
  const toplam = new Map<string, number>();
  for (const ps of parcaSatirlari) {
    const sonuc = flattenParca(ps.parcaId, ps.miktar, parcalar);
    for (const [mid, miktar] of sonuc) {
      toplam.set(mid, (toplam.get(mid) ?? 0) + miktar);
    }
  }
  const ihtiyac: MalzemeIhtiyac[] = [];
  for (const [mid, miktar] of toplam) {
    const m = malzemeler.find((x) => x.id === mid);
    if (m) {
      ihtiyac.push({
        malzeme: m,
        toplamMiktar: miktar,
        toplamFiyat: miktar * m.birimFiyat,
      });
    }
  }
  return ihtiyac.sort((a, b) =>
    a.malzeme.ad.localeCompare(b.malzeme.ad, "tr"),
  );
}

export type IhtiyacDokumSatiri = {
  malzeme: Malzeme;
  /** Fire hariç net ihtiyaç. */
  netMiktar: number;
  /** Fire dahil brüt ihtiyaç — stok motoru bu miktarı düşer. */
  brutMiktar: number;
  /** Tüketildiği istasyon slug'ları (reçete satırlarından). */
  istasyonlar: string[];
  /** Brüt miktar × birim fiyat. */
  tutar: number;
};

function dokumPatlat(
  parcaId: string,
  netCarpan: number,
  brutCarpan: number,
  parcalar: Parca[],
  topla: Map<string, { net: number; brut: number; istasyonlar: Set<string> }>,
  gezilen: Set<string>,
) {
  if (gezilen.has(parcaId)) return; // döngü koruması
  const parca = parcalar.find((p) => p.id === parcaId);
  if (!parca) return;
  const yeniGezilen = new Set(gezilen);
  yeniGezilen.add(parcaId);

  for (const s of parca.recete) {
    const net = s.miktar * netCarpan;
    const brut = s.miktar * (1 + (s.fire ?? 0) / 100) * brutCarpan;
    if (s.bilesen.tip === "malzeme") {
      const kayit = topla.get(s.bilesen.ref) ?? {
        net: 0,
        brut: 0,
        istasyonlar: new Set<string>(),
      };
      kayit.net += net;
      kayit.brut += brut;
      if (s.istasyon) kayit.istasyonlar.add(s.istasyon);
      topla.set(s.bilesen.ref, kayit);
    } else {
      dokumPatlat(s.bilesen.ref, net, brut, parcalar, topla, yeniGezilen);
    }
  }
}

/**
 * Model formu için canlı malzeme dökümü — stok motoruyla (stok.ts
 * parcayiPatlat) aynı fire mantığı: brüt = miktar × (1 + fire/100),
 * alt-parça çarpanına fire dahil edilir.
 */
export function modelIhtiyacDokumu(
  parcaSatirlari: ParcaSatiri[],
  parcalar: Parca[],
  malzemeler: Malzeme[],
): IhtiyacDokumSatiri[] {
  const topla = new Map<
    string,
    { net: number; brut: number; istasyonlar: Set<string> }
  >();
  for (const ps of parcaSatirlari) {
    dokumPatlat(ps.parcaId, ps.miktar, ps.miktar, parcalar, topla, new Set());
  }
  const sonuc: IhtiyacDokumSatiri[] = [];
  for (const [mid, k] of topla) {
    const m = malzemeler.find((x) => x.id === mid);
    if (!m) continue;
    // Reçetede istasyon belirtilmemişse malzemenin kendi bölümüne düş.
    let istasyonlar = [...k.istasyonlar];
    if (istasyonlar.length === 0) {
      const b = bolumSlug(m.bolum);
      if (b) istasyonlar = [b];
    }
    sonuc.push({
      malzeme: m,
      netMiktar: k.net,
      brutMiktar: k.brut,
      istasyonlar,
      tutar: k.brut * m.birimFiyat,
    });
  }
  return sonuc.sort((a, b) => b.tutar - a.tutar);
}

export type Yeterlilik = {
  ihtiyac: MalzemeIhtiyac[];
  /** Stoğu yetersiz kalan malzemeler. */
  eksik: MalzemeIhtiyac[];
  /** Tüm malzemeler yeterli mi? */
  yeterli: boolean;
  /** Tahmini toplam malzeme maliyeti. */
  toplamMaliyet: number;
};

/**
 * Bir model + adet için malzeme yeterliliğini hesaplar.
 * Üretim emri oluşturmadan önce "stok yeter mi?" kararını verir.
 */
export function malzemeYeterlilik(
  parcaSatirlari: ParcaSatiri[],
  parcalar: Parca[],
  malzemeler: Malzeme[],
): Yeterlilik {
  const ihtiyac = modelMalzemeIhtiyaci(parcaSatirlari, parcalar, malzemeler);
  const eksik = ihtiyac.filter((m) => m.toplamMiktar > m.malzeme.stok);
  const toplamMaliyet = ihtiyac.reduce((t, m) => t + m.toplamFiyat, 0);
  return { ihtiyac, eksik, yeterli: eksik.length === 0, toplamMaliyet };
}

/** Bir reçete satırının okuyucu için kısa metni: "Vida 4×40 (3 adet)" */
export function receteSatiriEtiket(
  satir: ReceteSatiri,
  parcalar: Parca[],
  malzemeler: Malzeme[],
): { ad: string; birim: string; tip: "Malzeme" | "Parça" } {
  if (satir.bilesen.tip === "malzeme") {
    const m = malzemeler.find((x) => x.id === satir.bilesen.ref);
    return { ad: m?.ad ?? "?", birim: m?.birim ?? "", tip: "Malzeme" };
  }
  const p = parcalar.find((x) => x.id === satir.bilesen.ref);
  return { ad: p?.ad ?? "?", birim: "adet", tip: "Parça" };
}
