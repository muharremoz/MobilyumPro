"use server";

import { revalidatePath } from "next/cache";

import { db } from "./index";
import { uretimEmri } from "./schema";
import type { UretimDurum, UretimOncelik } from "../data";

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
