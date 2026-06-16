"use server";

import { revalidatePath } from "next/cache";
import { inArray, eq } from "drizzle-orm";

import { db } from "./index";
import {
  uretimEmri,
  malzeme,
  urun,
  parca,
  receteSatiri,
  urunParca,
  depo,
  cari,
  cariIslem,
} from "./schema";
import type {
  UretimDurum,
  UretimOncelik,
  Malzeme,
  Urun,
  Parca,
  Depo,
  Cari,
  CariIslem,
  CariIslemTuru,
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

/** Ürün ekle/güncelle (düz alanlar + BOM/urun_parca). Yeni kayıtta URN-#### üretir. */
export async function urunKaydet(u: Urun): Promise<{ ok: boolean; id: string }> {
  let id = u.id;
  if (!id) {
    const mevcut = await db.select({ id: urun.id }).from(urun);
    let maxNo = 1000;
    for (const r of mevcut) {
      const m = /^URN-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    id = `URN-${maxNo + 1}`;
  }
  const row = {
    id,
    ad: u.ad,
    kategori: u.kategori,
    fiyat: String(u.fiyat),
    stok: u.stok,
    durum: u.durum,
    gorsel: u.gorsel ?? null,
    marka: u.marka ?? null,
    barkod: u.barkod ?? null,
    agirlik: u.agirlik != null ? String(u.agirlik) : null,
    minStok: u.minStok ?? null,
    gorseller: u.gorseller ?? null,
    varyantlar: u.varyantlar ?? null,
  };
  await db.transaction(async (tx) => {
    await tx
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
          marka: row.marka,
          barkod: row.barkod,
          agirlik: row.agirlik,
          minStok: row.minStok,
          gorseller: row.gorseller,
          varyantlar: row.varyantlar,
        },
      });

    // BOM'u tamamen yeniden yaz (geçerli parcaId'leri olan satırlar).
    await tx.delete(urunParca).where(eq(urunParca.urunId, id));
    const bom = (u.parcalar ?? [])
      .filter((p) => p.parcaId)
      .map((p) => ({ urunId: id, parcaId: p.parcaId, miktar: String(p.miktar) }));
    if (bom.length) await tx.insert(urunParca).values(bom);
  });

  revalidatePath("/urunler");
  revalidatePath("/stok-yonetimi");
  revalidatePath("/");
  return { ok: true, id };
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

/** Depo ekle/güncelle (id varsa upsert). Yeni kayıt için DEP-## kodu üretir. */
export async function depoKaydet(
  d: Depo,
): Promise<{ ok: boolean; id: string }> {
  let id = d.id;
  if (!id) {
    const mevcut = await db.select({ id: depo.id }).from(depo);
    let maxNo = 0;
    for (const r of mevcut) {
      const m = /^DEP-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    id = `DEP-${String(maxNo + 1).padStart(2, "0")}`;
  }
  const row = {
    id,
    ad: d.ad,
    sehir: d.sehir,
    kapasite: d.kapasite,
    doluluk: d.doluluk,
    durum: d.durum,
  };
  await db
    .insert(depo)
    .values(row)
    .onConflictDoUpdate({
      target: depo.id,
      set: {
        ad: row.ad,
        sehir: row.sehir,
        kapasite: row.kapasite,
        doluluk: row.doluluk,
        durum: row.durum,
      },
    });
  revalidatePath("/stok-yonetimi");
  return { ok: true, id };
}

export async function depoSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.delete(depo).where(inArray(depo.id, ids));
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch {
    return { ok: false, error: "Depo silinemedi." };
  }
}

/** Bir işlemin cari bakiyesine etkisi. Pozitif bakiye = cari bizden alacaklı. */
function bakiyeEtkisi(tur: CariIslemTuru, tutar: number): number {
  switch (tur) {
    case "Borç":
      return -tutar; // cari bize borçlandı
    case "Tahsilat":
      return +tutar; // borç tahsil edildi
    case "Alacak":
      return +tutar; // biz cari'ye borçlandık
    case "Ödeme":
      return -tutar; // ödeme yaptık
  }
}

/** Cari ekle/güncelle (id varsa upsert). Yeni kayıtta CARI-#### üretir. */
export async function cariKaydet(c: Cari): Promise<{ ok: boolean; id: string }> {
  let id = c.id;
  if (!id) {
    const mevcut = await db.select({ id: cari.id }).from(cari);
    let maxNo = 1000;
    for (const r of mevcut) {
      const m = /^CARI-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    id = `CARI-${maxNo + 1}`;
  }
  const row = {
    id,
    ad: c.ad,
    tip: c.tip,
    sinif: c.sinif,
    vergiNo: c.vergiNo ?? null,
    vergiDairesi: c.vergiDairesi ?? null,
    telefon: c.telefon ?? null,
    email: c.email ?? null,
    adres: c.adres ?? null,
    sehir: c.sehir ?? null,
    bakiye: String(c.bakiye),
    paraBirimi: c.paraBirimi,
    durum: c.durum,
    not: c.not ?? null,
  };
  await db
    .insert(cari)
    .values(row)
    .onConflictDoUpdate({
      target: cari.id,
      set: {
        ad: row.ad,
        tip: row.tip,
        sinif: row.sinif,
        vergiNo: row.vergiNo,
        vergiDairesi: row.vergiDairesi,
        telefon: row.telefon,
        email: row.email,
        adres: row.adres,
        sehir: row.sehir,
        // bakiye'yi düz kaydette değiştirmiyoruz (işlemler yönetir) — yeni kayıtta 0.
        paraBirimi: row.paraBirimi,
        durum: row.durum,
        not: row.not,
      },
    });
  revalidatePath("/cari");
  return { ok: true, id };
}

export async function cariSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    // cari_islem cascade ile silinir.
    await db.delete(cari).where(inArray(cari.id, ids));
    revalidatePath("/cari");
    return { ok: true };
  } catch {
    return { ok: false, error: "Cari silinemedi." };
  }
}

/** Cariye işlem ekle (insert) ve cari bakiyesini güncelle. CI-#### üretir. */
export async function cariIslemEkle(
  cariId: string,
  yeni: Omit<CariIslem, "id" | "cariId">,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const mevcut = await db.select({ id: cariIslem.id }).from(cariIslem);
    let maxNo = 3000;
    for (const r of mevcut) {
      const m = /^CI-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    const id = `CI-${maxNo + 1}`;

    await db.transaction(async (tx) => {
      await tx.insert(cariIslem).values({
        id,
        cariId,
        tarih: yeni.tarih,
        tur: yeni.tur,
        tutar: String(yeni.tutar),
        belge: yeni.belge ?? null,
        aciklama: yeni.aciklama,
      });
      const [c] = await tx
        .select({ bakiye: cari.bakiye })
        .from(cari)
        .where(eq(cari.id, cariId))
        .limit(1);
      const yeniBakiye =
        Number(c?.bakiye ?? 0) + bakiyeEtkisi(yeni.tur, yeni.tutar);
      await tx
        .update(cari)
        .set({ bakiye: String(yeniBakiye) })
        .where(eq(cari.id, cariId));
    });

    revalidatePath("/cari");
    revalidatePath(`/cari/${cariId}`);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "İşlem eklenemedi." };
  }
}
