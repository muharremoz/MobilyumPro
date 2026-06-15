"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq } from "drizzle-orm";

import { db } from "./index";
import { uretimEmri, malzeme, urun, parca, receteSatiri } from "./schema";
import type {
  UretimDurum,
  UretimOncelik,
  Malzeme,
  Urun,
  Parca,
} from "../data";

export type YeniUretimEmri = {
  urunId: string;
  urunAd: string;
  adet: number;
  durum: Extract<UretimDurum, "Üretimde" | "Planlandı">;
  oncelik?: UretimOncelik;
  termin?: string;
  musteri?: string;
  hedefDepo?: string;
  not?: string;
};

function bugun(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bir veya daha fazla üretim emrini DB'ye yazar; sonraki UE-#### kodlarını üretir. */
export async function uretimEmriOlustur(
  yeniler: YeniUretimEmri[],
): Promise<{ ok: boolean; ids: string[] }> {
  if (yeniler.length === 0) return { ok: false, ids: [] };

  // Mevcut en yüksek UE-#### kodundan devam et.
  const mevcut = await db.select({ id: uretimEmri.id }).from(uretimEmri);
  let maxNo = 4000;
  for (const r of mevcut) {
    const m = /^UE-(\d+)$/.exec(r.id);
    if (m) maxNo = Math.max(maxNo, Number(m[1]));
  }

  const tarih = bugun();
  const rows = yeniler.map((y, i) => ({
    id: `UE-${maxNo + 1 + i}`,
    urunId: y.urunId,
    urunAd: y.urunAd,
    adet: y.adet,
    durum: y.durum,
    oncelik: y.oncelik ?? "Normal",
    olusturma: tarih,
    termin: y.termin ?? null,
    musteri: y.musteri ?? null,
    hedefDepo: y.hedefDepo ?? null,
    not: y.not ?? null,
  }));

  await db.insert(uretimEmri).values(rows);
  revalidatePath("/uretim/emirler");

  return { ok: true, ids: rows.map((r) => r.id) };
}

/** Malzeme ekle/güncelle (id varsa upsert). */
export async function malzemeKaydet(m: Malzeme): Promise<{ ok: boolean }> {
  const row = {
    id: m.id,
    ad: m.ad,
    tip: m.tip,
    birim: m.birim,
    stok: String(m.stok),
    birimFiyat: String(m.birimFiyat),
    tedarikci: m.tedarikci ?? null,
    durum: m.durum,
  };
  await db
    .insert(malzeme)
    .values(row)
    .onConflictDoUpdate({
      target: malzeme.id,
      set: {
        ad: row.ad,
        tip: row.tip,
        birim: row.birim,
        stok: row.stok,
        birimFiyat: row.birimFiyat,
        tedarikci: row.tedarikci,
        durum: row.durum,
      },
    });
  revalidatePath("/stok-yonetimi");
  return { ok: true };
}

export async function malzemeSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.delete(malzeme).where(inArray(malzeme.id, ids));
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch {
    return { ok: false, error: "Reçetede kullanılan malzeme silinemez." };
  }
}

/** Ürün ekle/güncelle (düz alanlar; BOM/urun_parca'ya dokunmaz). */
export async function urunKaydet(u: Urun): Promise<{ ok: boolean }> {
  const row = {
    id: u.id,
    ad: u.ad,
    kategori: u.kategori,
    fiyat: String(u.fiyat),
    stok: u.stok,
    durum: u.durum,
    gorsel: u.gorsel ?? null,
  };
  await db
    .insert(urun)
    .values(row)
    .onConflictDoUpdate({
      target: urun.id,
      set: {
        ad: row.ad,
        kategori: row.kategori,
        fiyat: row.fiyat,
        stok: row.stok,
        durum: row.durum,
        gorsel: row.gorsel,
      },
    });
  revalidatePath("/urunler");
  revalidatePath("/stok-yonetimi");
  revalidatePath("/");
  return { ok: true };
}

export async function urunSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.delete(urun).where(inArray(urun.id, ids));
    revalidatePath("/urunler");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Üretim emri olan ürün silinemez." };
  }
}

/** Parça ekle/güncelle + reçetesini (recete_satiri) yeniden yaz (transaction). */
export async function parcaKaydet(
  p: Parca,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(parca)
        .values({
          id: p.id,
          ad: p.ad,
          kategori: p.kategori,
          aciklama: p.aciklama ?? null,
          durum: p.durum,
        })
        .onConflictDoUpdate({
          target: parca.id,
          set: {
            ad: p.ad,
            kategori: p.kategori,
            aciklama: p.aciklama ?? null,
            durum: p.durum,
          },
        });

      // Reçeteyi tamamen değiştir: önce sil, sonra ekle.
      await tx.delete(receteSatiri).where(eq(receteSatiri.parcaId, p.id));
      const satirlar = p.recete.map((r) => ({
        parcaId: p.id,
        tip: r.bilesen.tip,
        malzemeId: r.bilesen.tip === "malzeme" ? r.bilesen.ref : null,
        altParcaId: r.bilesen.tip === "parca" ? r.bilesen.ref : null,
        miktar: String(r.miktar),
      }));
      if (satirlar.length) await tx.insert(receteSatiri).values(satirlar);
    });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    return { ok: true };
  } catch {
    return { ok: false, error: "Parça kaydedilemedi." };
  }
}

export async function parcaSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.delete(parca).where(inArray(parca.id, ids));
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Başka reçetede/üründe kullanılan parça silinemez.",
    };
  }
}
