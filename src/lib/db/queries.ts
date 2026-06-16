import "server-only";
import { eq } from "drizzle-orm";

import { db } from "./index";
import {
  urun,
  parca,
  malzeme,
  receteSatiri,
  urunParca,
  depo,
  musteri,
  siparis,
  uretimEmri,
  cari,
  cariIslem,
  stokHareket,
} from "./schema";
import type {
  Urun,
  UrunVaryant,
  Parca,
  Malzeme,
  Depo,
  Musteri,
  Siparis,
  SiparisDurum,
  Kategori,
  ParcaKategori,
  MalzemeTipi,
  ReceteSatiri,
  UretimEmri,
  UretimDurum,
  UretimOncelik,
  Cari,
  CariTip,
  CariSinifi,
  ParaBirimi,
  CariIslem,
  CariIslemTuru,
  StokHareket,
  StokHareketTuru,
} from "../data";

/**
 * Server-only veri erişim katmanı. DB satırlarını (numeric → string gelir)
 * uygulamadaki domain tiplerine (data.ts) map'ler; böylece mevcut bileşenler
 * ve bom.ts değişmeden çalışır.
 */

export async function getUrunler(): Promise<Urun[]> {
  const [urunRows, upRows] = await Promise.all([
    db.select().from(urun),
    db.select().from(urunParca),
  ]);
  const bomByUrun = new Map<string, { parcaId: string; miktar: number }[]>();
  for (const r of upRows) {
    const arr = bomByUrun.get(r.urunId) ?? [];
    arr.push({ parcaId: r.parcaId, miktar: Number(r.miktar) });
    bomByUrun.set(r.urunId, arr);
  }
  return urunRows.map((u) => ({
    id: u.id,
    ad: u.ad,
    kategori: u.kategori as Kategori,
    fiyat: Number(u.fiyat),
    stok: u.stok,
    durum: u.durum,
    gorsel: u.gorsel ?? undefined,
    parcalar: bomByUrun.get(u.id),
    marka: u.marka ?? undefined,
    barkod: u.barkod ?? undefined,
    agirlik: u.agirlik != null ? Number(u.agirlik) : undefined,
    minStok: u.minStok ?? undefined,
    gorseller: u.gorseller ?? undefined,
    varyantlar: (u.varyantlar as UrunVaryant[] | null) ?? undefined,
  }));
}

export async function getParcalar(): Promise<Parca[]> {
  const [parcaRows, receteRows] = await Promise.all([
    db.select().from(parca),
    db.select().from(receteSatiri),
  ]);
  const receteByParca = new Map<string, ReceteSatiri[]>();
  for (const r of receteRows) {
    const satir: ReceteSatiri = {
      bilesen:
        r.tip === "malzeme"
          ? { tip: "malzeme", ref: r.malzemeId! }
          : { tip: "parca", ref: r.altParcaId! },
      miktar: Number(r.miktar),
    };
    const arr = receteByParca.get(r.parcaId) ?? [];
    arr.push(satir);
    receteByParca.set(r.parcaId, arr);
  }
  return parcaRows.map((p) => ({
    id: p.id,
    ad: p.ad,
    kategori: p.kategori as ParcaKategori,
    aciklama: p.aciklama ?? undefined,
    durum: p.durum,
    recete: receteByParca.get(p.id) ?? [],
  }));
}

export async function getMalzemeler(): Promise<Malzeme[]> {
  const rows = await db.select().from(malzeme);
  return rows.map((m) => ({
    id: m.id,
    ad: m.ad,
    tip: m.tip as MalzemeTipi,
    birim: m.birim,
    stok: Number(m.stok),
    birimFiyat: Number(m.birimFiyat),
    tedarikci: m.tedarikci ?? undefined,
    durum: m.durum,
  }));
}

export async function getDepolar(): Promise<Depo[]> {
  const rows = await db.select().from(depo);
  return rows.map((d) => ({
    id: d.id,
    ad: d.ad,
    sehir: d.sehir,
    kapasite: d.kapasite,
    doluluk: d.doluluk,
    durum: d.durum,
  }));
}

function mapCari(c: typeof cari.$inferSelect): Cari {
  return {
    id: c.id,
    ad: c.ad,
    tip: c.tip as CariTip,
    sinif: c.sinif as CariSinifi,
    vergiNo: c.vergiNo ?? undefined,
    vergiDairesi: c.vergiDairesi ?? undefined,
    telefon: c.telefon ?? undefined,
    email: c.email ?? undefined,
    adres: c.adres ?? undefined,
    sehir: c.sehir ?? undefined,
    bakiye: Number(c.bakiye),
    paraBirimi: c.paraBirimi as ParaBirimi,
    durum: c.durum,
    not: c.not ?? undefined,
  };
}

export async function getCariler(): Promise<Cari[]> {
  const rows = await db.select().from(cari);
  return rows.map(mapCari);
}

export async function getCari(id: string): Promise<Cari | null> {
  const rows = await db.select().from(cari).where(eq(cari.id, id)).limit(1);
  return rows[0] ? mapCari(rows[0]) : null;
}

export async function getCariIslemleri(cariId: string): Promise<CariIslem[]> {
  const rows = await db
    .select()
    .from(cariIslem)
    .where(eq(cariIslem.cariId, cariId));
  return rows
    .map((i) => ({
      id: i.id,
      cariId: i.cariId,
      tarih: i.tarih,
      tur: i.tur as CariIslemTuru,
      tutar: Number(i.tutar),
      belge: i.belge ?? undefined,
      aciklama: i.aciklama,
    }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

export async function getStokHareketleri(): Promise<StokHareket[]> {
  const rows = await db.select().from(stokHareket);
  return rows
    .map((h) => ({
      id: h.id,
      tarih: h.tarih,
      tur: h.tur as StokHareketTuru,
      ref:
        h.refTip === "urun"
          ? ({ tip: "urun", id: h.refId } as const)
          : ({ tip: "malzeme", id: h.refId } as const),
      miktar: Number(h.miktar),
      birim: h.birim,
      depo: h.depo,
      aciklama: h.aciklama,
    }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

/** Üretim planlama formunun ihtiyaç duyduğu hafif müşteri görünümü. */
export type MusteriSecim = { id: string; ad: string; sehir: string };

export async function getMusteriler(): Promise<MusteriSecim[]> {
  const rows = await db.select().from(musteri);
  return rows.map((m) => ({
    id: m.id,
    ad: m.ad,
    sehir: m.sehir ?? "",
  }));
}

export async function getSiparisler(): Promise<Siparis[]> {
  const rows = await db.select().from(siparis);
  return rows
    .map((s) => ({
      id: s.id,
      musteri: s.musteriAd,
      tarih: s.tarih,
      tutar: Number(s.tutar),
      durum: s.durum as SiparisDurum,
      urunAdedi: s.urunAdedi,
    }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Müşteriler + sipariş bazlı türetilmiş özet (siparişSayisi, toplamHarcama). */
export async function getMusterilerDetay(): Promise<Musteri[]> {
  const [musteriRows, siparisRows] = await Promise.all([
    db.select().from(musteri),
    db.select().from(siparis),
  ]);
  const adet = new Map<string, number>();
  const harcama = new Map<string, number>();
  for (const s of siparisRows) {
    if (!s.musteriId) continue;
    adet.set(s.musteriId, (adet.get(s.musteriId) ?? 0) + 1);
    if (s.durum !== "İptal") {
      harcama.set(
        s.musteriId,
        (harcama.get(s.musteriId) ?? 0) + Number(s.tutar),
      );
    }
  }
  return musteriRows.map((m) => ({
    id: m.id,
    ad: m.ad,
    email: m.email ?? "",
    sehir: m.sehir ?? "",
    siparisSayisi: adet.get(m.id) ?? 0,
    toplamHarcama: harcama.get(m.id) ?? 0,
  }));
}

export type DashboardOzet = {
  toplamCiro: number;
  siparisSayisi: number;
  urunSayisi: number;
  musteriSayisi: number;
  kritikStok: number;
  tukenenStok: number;
};

export async function getDashboardOzet(): Promise<DashboardOzet> {
  const [urunRows, siparisRows, musteriRows] = await Promise.all([
    db.select().from(urun),
    db.select().from(siparis),
    db.select().from(musteri),
  ]);
  return {
    toplamCiro: siparisRows
      .filter((s) => s.durum !== "İptal")
      .reduce((t, s) => t + Number(s.tutar), 0),
    siparisSayisi: siparisRows.length,
    urunSayisi: urunRows.length,
    musteriSayisi: musteriRows.length,
    kritikStok: urunRows.filter((u) => u.stok > 0 && u.stok <= 5).length,
    tukenenStok: urunRows.filter((u) => u.stok === 0).length,
  };
}

export async function getUretimEmirleri(): Promise<UretimEmri[]> {
  const rows = await db.select().from(uretimEmri);
  const sirali = rows.sort((a, b) => b.id.localeCompare(a.id));
  return sirali.map((e) => ({
    id: e.id,
    urunId: e.urunId,
    urunAd: e.urunAd,
    adet: e.adet,
    durum: e.durum as UretimDurum,
    oncelik: (e.oncelik ?? undefined) as UretimOncelik | undefined,
    olusturma: e.olusturma,
    termin: e.termin ?? undefined,
    kaynakSiparis: e.kaynakSiparis ?? undefined,
    musteri: e.musteri ?? undefined,
    hedefDepo: e.hedefDepo ?? undefined,
    not: e.not ?? undefined,
  }));
}
