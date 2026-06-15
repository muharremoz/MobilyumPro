import "server-only";

import { db } from "./index";
import {
  urun,
  parca,
  malzeme,
  receteSatiri,
  urunParca,
  depo,
  musteri,
  uretimEmri,
} from "./schema";
import type {
  Urun,
  Parca,
  Malzeme,
  Depo,
  Kategori,
  ParcaKategori,
  MalzemeTipi,
  ReceteSatiri,
  UretimEmri,
  UretimDurum,
  UretimOncelik,
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
    durum: d.durum,
  }));
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
