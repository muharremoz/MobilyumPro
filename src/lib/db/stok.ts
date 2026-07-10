import "server-only";

import { db } from "./index";
import { PARAMETRELER } from "../parametreler";
import { ROTA, type IstasyonSlug } from "../fabrika";

/**
 * Stok motoru — tek kaynak: stok_hareket defteri (ledger).
 * Malzeme.stok yalnızca hızlı okunan özettir; her düşüş/giriş harekete yazılır.
 *
 * İki mod (sistem parametresi "uretimde_hemen_dus"):
 *  - AÇIK  → emir üretime geçince reçetenin tamamı tek seferde düşer.
 *  - KAPALI→ malzemeler rezerve sayılır; her istasyon tamamlandıkça o
 *            istasyona atanmış bileşenler düşer.
 * Her iki modda da paketleme adımı bitince mamul (model) stoğa girer.
 *
 * Kullanılabilir stok = eldeki − rezerve.
 * Rezerv saklanmaz, hesaplanır: açık emirlerin ihtiyacı − o emir için yazılmış
 * çıkışlar (stok_hareket.emir_id üzerinden) → mod/parametre değişse bile
 * tutarlı kalır.
 */

// ── Parametre okuma ──────────────────────────────────────────────────────
export async function parametreDegeri(anahtar: string): Promise<string> {
  const row = await db.sistemParametre.findUnique({ where: { anahtar } });
  return (
    row?.deger ??
    PARAMETRELER.find((p) => p.anahtar === anahtar)?.varsayilan ??
    ""
  );
}
const acikMi = (v: string) => v === "true";

// ── BOM patlatma (fire + istasyon dahil, çok seviyeli) ───────────────────
export type Ihtiyac = {
  malzemeId: string;
  istasyon: IstasyonSlug;
  miktar: number; // brüt (fire dahil)
};

type ParcaSatirlari = Map<
  string,
  {
    tip: string;
    malzemeId: string | null;
    altParcaId: string | null;
    miktar: number;
    fire: number;
    istasyon: string | null;
  }[]
>;

async function parcaSatirlariniYukle(): Promise<ParcaSatirlari> {
  const satirlar = await db.receteSatiri.findMany();
  const m: ParcaSatirlari = new Map();
  for (const s of satirlar) {
    const arr = m.get(s.parcaId) ?? [];
    arr.push({
      tip: s.tip,
      malzemeId: s.malzemeId,
      altParcaId: s.altParcaId,
      miktar: Number(s.miktar),
      fire: Number(s.fire),
      istasyon: s.istasyon,
    });
    m.set(s.parcaId, arr);
  }
  return m;
}

function parcayiPatlat(
  parcaId: string,
  carpan: number,
  satirlar: ParcaSatirlari,
  topla: Map<string, Map<IstasyonSlug, number>>,
  gezilen: Set<string>,
) {
  if (gezilen.has(parcaId)) return; // döngü koruması
  const yeniGezilen = new Set(gezilen);
  yeniGezilen.add(parcaId);
  for (const s of satirlar.get(parcaId) ?? []) {
    const brut = s.miktar * (1 + s.fire / 100) * carpan;
    if (s.tip === "malzeme" && s.malzemeId) {
      const istasyon = (s.istasyon ?? ROTA[0]) as IstasyonSlug;
      const ic = topla.get(s.malzemeId) ?? new Map<IstasyonSlug, number>();
      ic.set(istasyon, (ic.get(istasyon) ?? 0) + brut);
      topla.set(s.malzemeId, ic);
    } else if (s.tip === "parca" && s.altParcaId) {
      parcayiPatlat(s.altParcaId, brut, satirlar, topla, yeniGezilen);
    }
  }
}

/** Modelin toplam malzeme ihtiyacı (adet ile çarpılmış, istasyona kırılımlı). */
export async function modelIhtiyaclari(
  modelId: string,
  adet: number,
): Promise<Ihtiyac[]> {
  const [bom, satirlar] = await Promise.all([
    db.modelParca.findMany({ where: { modelId } }),
    parcaSatirlariniYukle(),
  ]);
  const topla = new Map<string, Map<IstasyonSlug, number>>();
  for (const mp of bom) {
    parcayiPatlat(mp.parcaId, Number(mp.miktar) * adet, satirlar, topla, new Set());
  }
  const sonuc: Ihtiyac[] = [];
  for (const [malzemeId, ic] of topla) {
    for (const [istasyon, miktar] of ic) {
      sonuc.push({ malzemeId, istasyon, miktar });
    }
  }
  return sonuc;
}

// ── Emir bazında düşülmüşler (ledger'dan) ───────────────────────────────
async function emirDusulenleri(emirId: string): Promise<Map<string, number>> {
  const rows = await db.stokHareket.findMany({
    where: { emirId, tur: "Çıkış", refTip: "malzeme" },
  });
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.refId, (m.get(r.refId) ?? 0) + Number(r.miktar));
  return m;
}

// ── Hareket yazma yardımcıları ──────────────────────────────────────────
async function sonrakiHareketNo(): Promise<number> {
  const rows = await db.stokHareket.findMany({ select: { id: true } });
  let maxNo = 1000;
  for (const r of rows) {
    const m = /^SH-(\d+)$/.exec(r.id);
    if (m) maxNo = Math.max(maxNo, Number(m[1]));
  }
  return maxNo + 1;
}

export type EksikMalzeme = {
  malzemeId: string;
  ad: string;
  birim: string;
  gereken: number;
  eldeki: number;
};

type DusumSonuc = {
  ok: boolean;
  /** Yetersiz kalan malzemeler (negatif_stok açıksa uyarı, kapalıysa engel). */
  eksikler: EksikMalzeme[];
  error?: string;
};

/** Verilen malzeme→miktar düşüşlerini tek transaction'da yazar. */
async function dusumYaz(
  emir: { id: string; modelAd: string },
  kalemler: { malzemeId: string; miktar: number; istasyon?: IstasyonSlug }[],
  aciklamaEk: string,
): Promise<DusumSonuc> {
  const net = kalemler.filter((k) => k.miktar > 0.0005);
  if (net.length === 0) return { ok: true, eksikler: [] };

  const [malzemeler, negatifIzin, depo] = await Promise.all([
    db.stok.findMany({
      where: { id: { in: net.map((k) => k.malzemeId) } },
    }),
    parametreDegeri("negatif_stok").then(acikMi),
    parametreDegeri("varsayilan_depo"),
  ]);
  const malzemeMap = new Map(malzemeler.map((m) => [m.id, m]));

  const eksikler: EksikMalzeme[] = [];
  for (const k of net) {
    const m = malzemeMap.get(k.malzemeId);
    if (!m) continue;
    if (Number(m.stokMiktar) < k.miktar) {
      eksikler.push({
        malzemeId: k.malzemeId,
        ad: m.ad,
        birim: m.stokBirimi,
        gereken: k.miktar,
        eldeki: Number(m.stokMiktar),
      });
    }
  }
  if (eksikler.length > 0 && !negatifIzin) {
    return {
      ok: false,
      eksikler,
      error: "Stok yetersiz — Negatif Stok parametresi kapalı.",
    };
  }

  const bugun = new Date(new Date().toISOString().slice(0, 10));
  let no = await sonrakiHareketNo();

  await db.$transaction(async (tx) => {
    for (const k of net) {
      const m = malzemeMap.get(k.malzemeId);
      if (!m) continue;
      await tx.stokHareket.create({
        data: {
          id: `SH-${no++}`,
          tarih: bugun,
          tur: "Çıkış",
          refTip: "malzeme",
          refId: k.malzemeId,
          miktar: k.miktar,
          birim: m.stokBirimi,
          depo,
          aciklama: `${emir.id} · ${emir.modelAd} — ${aciklamaEk}`,
          emirId: emir.id,
          istasyon: k.istasyon ?? null,
        },
      });
      await tx.stok.update({
        where: { id: k.malzemeId },
        data: { stokMiktar: { decrement: k.miktar } },
      });
    }
  });

  return { ok: true, eksikler };
}

// ── Mod 1: üretime geçişte toplu düşüm ──────────────────────────────────
export async function uretimeGecisDusumu(emir: {
  id: string;
  modelId: string;
  modelAd: string;
  adet: number;
}): Promise<DusumSonuc> {
  const hemenDus = acikMi(await parametreDegeri("uretimde_hemen_dus"));
  if (!hemenDus) return { ok: true, eksikler: [] }; // Mod 2: rezerv yeter

  const [ihtiyaclar, dusulen] = await Promise.all([
    modelIhtiyaclari(emir.modelId, emir.adet),
    emirDusulenleri(emir.id),
  ]);
  // İstasyon kırılımını topla (mod 1 tek kalemde düşer) − önce düşülmüşleri çıkar.
  const toplam = new Map<string, number>();
  for (const i of ihtiyaclar)
    toplam.set(i.malzemeId, (toplam.get(i.malzemeId) ?? 0) + i.miktar);
  const kalemler = [...toplam.entries()].map(([malzemeId, miktar]) => ({
    malzemeId,
    miktar: miktar - (dusulen.get(malzemeId) ?? 0),
  }));
  return dusumYaz(emir, kalemler, "üretime geçiş (toplu düşüm)");
}

// ── Mod 2: istasyon tamamlanınca o istasyonun tüketimi ──────────────────
export async function istasyonDusumu(
  emir: { id: string; modelId: string; modelAd: string; adet: number },
  istasyon: IstasyonSlug,
): Promise<DusumSonuc> {
  const hemenDus = acikMi(await parametreDegeri("uretimde_hemen_dus"));
  if (hemenDus) return { ok: true, eksikler: [] }; // Mod 1'de zaten düşüldü

  const [ihtiyaclar, dusulenRows] = await Promise.all([
    modelIhtiyaclari(emir.modelId, emir.adet),
    db.stokHareket.findMany({
      where: { emirId: emir.id, tur: "Çıkış", refTip: "malzeme", istasyon },
    }),
  ]);
  const dusulen = new Map<string, number>();
  for (const r of dusulenRows)
    dusulen.set(r.refId, (dusulen.get(r.refId) ?? 0) + Number(r.miktar));

  const kalemler = ihtiyaclar
    .filter((i) => i.istasyon === istasyon)
    .map((i) => ({
      malzemeId: i.malzemeId,
      miktar: i.miktar - (dusulen.get(i.malzemeId) ?? 0),
      istasyon,
    }));
  return dusumYaz(emir, kalemler, `${istasyon} istasyonu tüketimi`);
}

// ── Paketleme bitişinde mamul girişi ────────────────────────────────────
export async function mamulGirisi(emir: {
  id: string;
  modelId: string;
  modelAd: string;
  adet: number;
}): Promise<void> {
  // Aynı emir için ikinci kez giriş yazma.
  const mevcut = await db.stokHareket.findFirst({
    where: { emirId: emir.id, tur: "Giriş", refTip: "model" },
  });
  if (mevcut) return;

  const depo = await parametreDegeri("varsayilan_depo");
  const bugun = new Date(new Date().toISOString().slice(0, 10));
  const no = await sonrakiHareketNo();

  await db.$transaction(async (tx) => {
    await tx.stokHareket.create({
      data: {
        id: `SH-${no}`,
        tarih: bugun,
        tur: "Giriş",
        refTip: "model",
        refId: emir.modelId,
        miktar: emir.adet,
        birim: "adet",
        depo,
        aciklama: `${emir.id} · ${emir.modelAd} — üretimden giriş (paketleme tamam)`,
        emirId: emir.id,
        istasyon: "paketleme",
      },
    });
    await tx.stok.update({
      where: { id: emir.modelId },
      data: { stokMiktar: { increment: emir.adet } },
    });
  });
}

// ── Rezerv / kullanılabilir stok ────────────────────────────────────────
export type StokOzeti = {
  malzemeId: string;
  eldeki: number;
  rezerve: number;
  kullanilabilir: number;
};

/** Açık emirlerin (Planlandı + Üretimde) henüz düşülmemiş ihtiyacı. */
export async function stokOzetleri(): Promise<Map<string, StokOzeti>> {
  const [malzemeler, emirler, hareketler] = await Promise.all([
    db.stok.findMany({ where: { grup: { in: ["Hammadde", "Yarı Mamül"] } } }),
    db.uretimEmri.findMany({
      where: { durum: { in: ["Planlandı", "Üretimde"] } },
    }),
    db.stokHareket.findMany({
      where: { tur: "Çıkış", refTip: "malzeme", emirId: { not: null } },
    }),
  ]);

  const dusulen = new Map<string, number>(); // `${emirId}:${malzemeId}` → miktar
  for (const h of hareketler) {
    const k = `${h.emirId}:${h.refId}`;
    dusulen.set(k, (dusulen.get(k) ?? 0) + Number(h.miktar));
  }

  const rezerve = new Map<string, number>();
  const satirlar = await parcaSatirlariniYukle();
  const bomlar = await db.modelParca.findMany();
  const bomByModel = new Map<string, typeof bomlar>();
  for (const b of bomlar) {
    const arr = bomByModel.get(b.modelId) ?? [];
    arr.push(b);
    bomByModel.set(b.modelId, arr);
  }

  for (const e of emirler) {
    const topla = new Map<string, Map<IstasyonSlug, number>>();
    for (const mp of bomByModel.get(e.modelId) ?? []) {
      parcayiPatlat(
        mp.parcaId,
        Number(mp.miktar) * e.adet,
        satirlar,
        topla,
        new Set(),
      );
    }
    for (const [malzemeId, ic] of topla) {
      let toplam = 0;
      for (const [, m] of ic) toplam += m;
      const kalan = toplam - (dusulen.get(`${e.id}:${malzemeId}`) ?? 0);
      if (kalan > 0.0005)
        rezerve.set(malzemeId, (rezerve.get(malzemeId) ?? 0) + kalan);
    }
  }

  const sonuc = new Map<string, StokOzeti>();
  for (const m of malzemeler) {
    const eldeki = Number(m.stokMiktar);
    const r = rezerve.get(m.id) ?? 0;
    sonuc.set(m.id, {
      malzemeId: m.id,
      eldeki,
      rezerve: r,
      kullanilabilir: eldeki - r,
    });
  }
  return sonuc;
}
