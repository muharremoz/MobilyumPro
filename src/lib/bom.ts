// BOM (Bill of Materials) yardımcıları — bir parça/modelin tüm alt parçalarını
// recursive açıp toplam malzeme dökümünü çıkarır.

import {
  type Parca,
  type Malzeme,
  type ParcaSatiri,
  type ReceteSatiri,
} from "@/lib/data";

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
