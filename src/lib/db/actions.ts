"use server";

import { revalidatePath } from "next/cache";

import { db, tarihDate } from "./index";
import { sifreHashle } from "./sifre";
import { ROTA, type IstasyonSlug } from "../fabrika";
import {
  istasyonDusumu,
  mamulGirisi,
  uretimeGecisDusumu,
  type EksikMalzeme,
} from "./stok";
import type { ModulYetki } from "../yetki";
import type {
  UretimDurum,
  UretimOncelik,
  Malzeme,
  Model,
  Parca,
  Depo,
  Cari,
  CariIslem,
  CariIslemTuru,
  CariBanka,
  CariSube,
  CariYetkili,
  CariCrm,
  CariDokuman,
  Poset,
  TanimTip,
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
): Promise<{ ok: boolean; ids: string[]; uyarilar?: string[] }> {
  if (yeniler.length === 0) return { ok: false, ids: [] };

  // Mevcut en yüksek UE-#### kodundan devam et.
  const mevcut = await db.uretimEmri.findMany({ select: { id: true } });
  let maxNo = 4000;
  for (const r of mevcut) {
    const m = /^UE-(\d+)$/.exec(r.id);
    if (m) maxNo = Math.max(maxNo, Number(m[1]));
  }

  const tarih = bugun();
  const rows = yeniler.map((y, i) => ({
    id: `UE-${maxNo + 1 + i}`,
    modelId: y.urunId,
    modelAd: y.urunAd,
    adet: y.adet,
    durum: y.durum,
    oncelik: y.oncelik ?? "Normal",
    olusturma: tarihDate(tarih),
    termin: y.termin ? tarihDate(y.termin) : null,
    musteri: y.musteri ?? null,
    hedefDepo: y.hedefDepo ?? null,
    not: y.not ?? null,
  }));

  await db.uretimEmri.createMany({ data: rows });

  // Fabrika rotası: her emir için istasyon adımlarını oluştur.
  // "Üretimde" başlayan emirde ilk adım hemen İşleniyor olur.
  await db.uretimEmriAdim.createMany({
    data: rows.flatMap((r) =>
      ROTA.map((istasyon, i) => ({
        emirId: r.id,
        istasyon,
        sira: i + 1,
        durum: r.durum === "Üretimde" && i === 0 ? "İşleniyor" : "Bekliyor",
        baslangic: r.durum === "Üretimde" && i === 0 ? new Date() : null,
      })),
    ),
  });

  // Üretimde doğan emirler: mod 1 toplu düşüm. Negatif stok kapalı ve stok
  // yetersizse emir Planlandı'ya çekilir (rezerve bekler), uyarı döner.
  const uyarilar: string[] = [];
  for (const r of rows.filter((x) => x.durum === "Üretimde")) {
    const dusum = await uretimeGecisDusumu({
      id: r.id,
      modelId: r.modelId,
      modelAd: r.modelAd,
      adet: r.adet,
    });
    if (!dusum.ok) {
      await db.$transaction(async (tx) => {
        await tx.uretimEmri.update({
          where: { id: r.id },
          data: { durum: "Planlandı" },
        });
        await tx.uretimEmriAdim.updateMany({
          where: { emirId: r.id },
          data: { durum: "Bekliyor", baslangic: null },
        });
      });
      uyarilar.push(
        `${r.id}: stok yetersiz, Planlandı olarak bekletildi (${dusum.eksikler
          .map((e) => e.ad)
          .join(", ")})`,
      );
    } else if (dusum.eksikler.length > 0) {
      uyarilar.push(
        `${r.id}: negatif stoğa düşüldü (${dusum.eksikler
          .map((e) => e.ad)
          .join(", ")})`,
      );
    }
  }

  revalidatePath("/uretim/emirler");
  revalidatePath("/uretim/fabrika");
  revalidatePath("/stok-yonetimi");

  return { ok: true, ids: rows.map((r) => r.id), uyarilar };
}

/**
 * Emri fabrika rotasında bir adım ilerletir: aktif (İşleniyor) adım
 * tamamlanır, sıradaki adım İşleniyor olur. Planlandı'daki emirde ilk
 * adımı başlatır; son adım bitince emir Tamamlandı olur.
 *
 * Stok entegrasyonu:
 *  - Başlatmada mod 1 (uretimde_hemen_dus) toplu düşüm yapılır.
 *  - Adım tamamlanınca mod 2'de o istasyonun bileşenleri düşer.
 *  - Paketleme adımı bitince mamul stoğa girer.
 * Negatif stok kapalıysa yetersizlik ilerlemeyi ENGELLER; açıksa uyarı döner.
 */
export async function emriIlerlet(emirId: string): Promise<{
  ok: boolean;
  error?: string;
  eksikler?: EksikMalzeme[];
}> {
  try {
    const emir = await db.uretimEmri.findUnique({
      where: { id: emirId },
      include: { adimlar: { orderBy: { sira: "asc" } } },
    });
    if (!emir) return { ok: false, error: "Emir bulunamadı." };
    const adimlar = emir.adimlar;
    if (adimlar.length === 0)
      return { ok: false, error: "Emrin rota adımları yok." };

    const emirBilgi = {
      id: emir.id,
      modelId: emir.modelId,
      modelAd: emir.modelAd,
      adet: emir.adet,
    };
    const simdi = new Date();
    const isleniyor = adimlar.find((a) => a.durum === "İşleniyor");
    let eksikler: EksikMalzeme[] = [];

    if (!isleniyor) {
      // Henüz başlamamış: önce mod 1 düşümü (engellenebilir), sonra başlat.
      const dusum = await uretimeGecisDusumu(emirBilgi);
      if (!dusum.ok)
        return { ok: false, error: dusum.error, eksikler: dusum.eksikler };
      eksikler = dusum.eksikler;

      const ilkBekleyen = adimlar.find((a) => a.durum === "Bekliyor");
      if (ilkBekleyen) {
        await db.$transaction(async (tx) => {
          await tx.uretimEmriAdim.update({
            where: { id: ilkBekleyen.id },
            data: { durum: "İşleniyor", baslangic: simdi },
          });
          await tx.uretimEmri.update({
            where: { id: emirId },
            data: { durum: "Üretimde" },
          });
        });
      }
    } else {
      // Adım tamamlanıyor: önce mod 2 istasyon tüketimi (engellenebilir).
      const dusum = await istasyonDusumu(
        emirBilgi,
        isleniyor.istasyon as IstasyonSlug,
      );
      if (!dusum.ok)
        return { ok: false, error: dusum.error, eksikler: dusum.eksikler };
      eksikler = dusum.eksikler;

      await db.$transaction(async (tx) => {
        await tx.uretimEmriAdim.update({
          where: { id: isleniyor.id },
          data: { durum: "Tamamlandı", bitis: simdi },
        });
        const sonraki = adimlar.find((a) => a.sira === isleniyor.sira + 1);
        if (sonraki) {
          await tx.uretimEmriAdim.update({
            where: { id: sonraki.id },
            data: { durum: "İşleniyor", baslangic: simdi },
          });
          await tx.uretimEmri.update({
            where: { id: emirId },
            data: { durum: "Üretimde" },
          });
        } else {
          await tx.uretimEmri.update({
            where: { id: emirId },
            data: { durum: "Tamamlandı" },
          });
        }
      });

      // Paketleme bitti → mamul girişi (her iki modda).
      if (isleniyor.istasyon === "paketleme") {
        await mamulGirisi(emirBilgi);
        revalidatePath("/urunler");
        revalidatePath("/stok-yonetimi");
      }
    }

    revalidatePath("/uretim/fabrika");
    revalidatePath("/uretim/emirler");
    return { ok: true, eksikler: eksikler.length ? eksikler : undefined };
  } catch {
    return { ok: false, error: "Emir ilerletilemedi." };
  }
}

/**
 * Emri iptal eder. Tamamlanmış emir iptal edilemez.
 * Not: Düşülmüş stokların iadesi şimdilik kapsam dışı — hareketler
 * ledger'da kalır, rezerv hesabı iptal emrini zaten dışlar.
 */
export async function emriIptalEt(
  emirId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const emir = await db.uretimEmri.findUnique({ where: { id: emirId } });
    if (!emir) return { ok: false, error: "Emir bulunamadı." };
    if (emir.durum === "Tamamlandı")
      return { ok: false, error: "Tamamlanmış emir iptal edilemez." };
    if (emir.durum === "İptal")
      return { ok: false, error: "Emir zaten iptal edilmiş." };

    await db.uretimEmri.update({
      where: { id: emirId },
      data: { durum: "İptal" },
    });
    revalidatePath("/uretim/emirler");
    revalidatePath("/uretim/fabrika");
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch {
    return { ok: false, error: "Emir iptal edilemedi." };
  }
}

/** Rota adımı olmayan (eski) emirlere adımları üretir. */
export async function eksikAdimlariOlustur(): Promise<{
  ok: boolean;
  eklenen: number;
}> {
  const emirler = await db.uretimEmri.findMany({
    where: { durum: { notIn: ["İptal", "Tamamlandı"] } },
    include: { adimlar: { select: { id: true } } },
  });
  const eksikler = emirler.filter((e) => e.adimlar.length === 0);
  if (eksikler.length === 0) return { ok: true, eklenen: 0 };

  await db.uretimEmriAdim.createMany({
    data: eksikler.flatMap((e) =>
      ROTA.map((istasyon, i) => ({
        emirId: e.id,
        istasyon,
        sira: i + 1,
        durum: e.durum === "Üretimde" && i === 0 ? "İşleniyor" : "Bekliyor",
        baslangic: e.durum === "Üretimde" && i === 0 ? new Date() : null,
      })),
    ),
  });
  revalidatePath("/uretim/fabrika");
  return { ok: true, eklenen: eksikler.length };
}

/** Malzeme ekle/güncelle (id varsa upsert). */
export async function malzemeKaydet(m: Malzeme): Promise<{ ok: boolean }> {
  const veri = {
    ad: m.ad,
    grup: m.grup ?? null,
    birim: m.birim,
    stok: m.stok,
    birimFiyat: m.birimFiyat,
    tedarikci: m.tedarikci ?? null,
    durum: m.durum,
  };
  await db.malzeme.upsert({
    where: { id: m.id },
    create: { id: m.id, ...veri },
    update: veri,
  });
  revalidatePath("/stok-yonetimi");
  return { ok: true };
}

export async function malzemeSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.malzeme.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch {
    return { ok: false, error: "Reçetede kullanılan malzeme silinemez." };
  }
}

/** Ürün ekle/güncelle (düz alanlar + BOM/urun_parca). Yeni kayıtta URN-#### üretir. */
export async function modelKaydet(u: Model): Promise<{ ok: boolean; id: string }> {
  let id = u.id;
  if (!id) {
    const mevcut = await db.model.findMany({ select: { id: true } });
    let maxNo = 1000;
    for (const r of mevcut) {
      const m = /^URN-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    id = `URN-${maxNo + 1}`;
  }
  const veri = {
    ad: u.ad,
    kategori: u.kategori,
    fiyat: u.fiyat,
    stok: u.stok,
    durum: u.durum,
    gorsel: u.gorsel ?? null,
    marka: u.marka ?? null,
    barkod: u.barkod ?? null,
    agirlik: u.agirlik ?? null,
    minStok: u.minStok ?? null,
    gorsellerJson: u.gorseller ? JSON.stringify(u.gorseller) : null,
    varyantlarJson: u.varyantlar ? JSON.stringify(u.varyantlar) : null,
  };
  await db.$transaction(async (tx) => {
    await tx.model.upsert({
      where: { id },
      create: { id, ...veri },
      update: veri,
    });

    // BOM'u tamamen yeniden yaz (geçerli parcaId'leri olan satırlar).
    await tx.modelParca.deleteMany({ where: { modelId: id } });
    const bom = (u.parcalar ?? [])
      .filter((p) => p.parcaId)
      .map((p) => ({ modelId: id, parcaId: p.parcaId, miktar: p.miktar }));
    if (bom.length) await tx.modelParca.createMany({ data: bom });
  });

  revalidatePath("/urunler");
  revalidatePath("/stok-yonetimi");
  revalidatePath("/");
  return { ok: true, id };
}

export async function modelSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.model.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/urunler");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Üretim emri olan model silinemez." };
  }
}

/** Versiyon anlık kopyasındaki satır biçimi. */
export type ReceteSnapshotSatir = {
  tip: "malzeme" | "parca";
  ref: string;
  miktar: number;
  fire?: number;
  istasyon?: string;
};

function receteSnapshot(recete: Parca["recete"]): ReceteSnapshotSatir[] {
  return recete.map((r) => ({
    tip: r.bilesen.tip,
    ref: r.bilesen.ref,
    miktar: r.miktar,
    ...(r.fire ? { fire: r.fire } : {}),
    ...(r.istasyon ? { istasyon: r.istasyon } : {}),
  }));
}

/**
 * Parça/reçete ekle-güncelle + satırları yeniden yaz (transaction).
 * Satırlar değiştiyse recete_versiyon'a anlık kopya ekler (tam geçmiş).
 * id boşsa PRC-#### üretir.
 */
export async function parcaKaydet(
  p: Omit<Parca, "id"> & { id?: string },
  aciklama?: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    let id = p.id;
    if (!id) {
      const mevcut = await db.parca.findMany({ select: { id: true } });
      let maxNo = 2000;
      for (const r of mevcut) {
        const m = /^PRC-(\d+)$/.exec(r.id);
        if (m) maxNo = Math.max(maxNo, Number(m[1]));
      }
      id = `PRC-${maxNo + 1}`;
    }
    const parcaId = id;

    await db.$transaction(async (tx) => {
      const veri = {
        ad: p.ad,
        kategori: p.kategori,
        aciklama: p.aciklama ?? null,
        durum: p.durum,
      };
      await tx.parca.upsert({
        where: { id: parcaId },
        create: { id: parcaId, ...veri },
        update: veri,
      });

      // Reçeteyi tamamen değiştir: önce sil, sonra ekle.
      await tx.receteSatiri.deleteMany({ where: { parcaId } });
      const satirlar = p.recete.map((r) => ({
        parcaId,
        tip: r.bilesen.tip,
        malzemeId: r.bilesen.tip === "malzeme" ? r.bilesen.ref : null,
        altParcaId: r.bilesen.tip === "parca" ? r.bilesen.ref : null,
        miktar: r.miktar,
        fire: r.fire ?? 0,
        istasyon: r.istasyon ?? null,
      }));
      if (satirlar.length) await tx.receteSatiri.createMany({ data: satirlar });

      // Versiyon: son anlık kopyayla aynıysa yazma.
      const snapshot = receteSnapshot(p.recete);
      const son = await tx.receteVersiyon.findFirst({
        where: { parcaId },
        orderBy: { versiyonNo: "desc" },
      });
      if (!son || son.satirlarJson !== JSON.stringify(snapshot)) {
        await tx.receteVersiyon.create({
          data: {
            parcaId,
            versiyonNo: (son?.versiyonNo ?? 0) + 1,
            aciklama: aciklama?.trim() || null,
            satirlarJson: JSON.stringify(snapshot),
          },
        });
      }
    });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    return { ok: true, id: parcaId };
  } catch {
    return { ok: false, error: "Reçete kaydedilemedi." };
  }
}

/** Reçeteyi yeni bir kayıt olarak kopyalar (satırlar dahil, v1 ile başlar). */
export async function receteKopyala(
  kaynakId: string,
  yeniAd: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const kaynak = await db.parca.findUnique({
      where: { id: kaynakId },
      include: { recete: true },
    });
    if (!kaynak) return { ok: false, error: "Kaynak reçete bulunamadı." };

    const res = await parcaKaydet(
      {
        ad: yeniAd.trim() || `${kaynak.ad} (kopya)`,
        kategori: kaynak.kategori as Parca["kategori"],
        aciklama: kaynak.aciklama ?? undefined,
        durum: kaynak.durum as "Aktif" | "Pasif",
        recete: kaynak.recete.map((r) => ({
          bilesen:
            r.tip === "malzeme"
              ? { tip: "malzeme" as const, ref: r.malzemeId! }
              : { tip: "parca" as const, ref: r.altParcaId! },
          miktar: Number(r.miktar),
          fire: Number(r.fire) || undefined,
          istasyon: r.istasyon ?? undefined,
        })),
      },
      `"${kaynak.ad}" reçetesinden kopyalandı`,
    );
    return res;
  } catch {
    return { ok: false, error: "Reçete kopyalanamadı." };
  }
}

/** Reçeteyi eski bir versiyona döndürür (geri dönüş de yeni versiyon olur). */
export async function receteGeriYukle(
  parcaId: string,
  versiyonNo: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [parca, versiyon] = await Promise.all([
      db.parca.findUnique({ where: { id: parcaId } }),
      db.receteVersiyon.findUnique({
        where: { parcaId_versiyonNo: { parcaId, versiyonNo } },
      }),
    ]);
    if (!parca || !versiyon)
      return { ok: false, error: "Versiyon bulunamadı." };

    const satirlar = JSON.parse(versiyon.satirlarJson) as ReceteSnapshotSatir[];
    return await parcaKaydet(
      {
        id: parcaId,
        ad: parca.ad,
        kategori: parca.kategori as Parca["kategori"],
        aciklama: parca.aciklama ?? undefined,
        durum: parca.durum as "Aktif" | "Pasif",
        recete: satirlar.map((s) => ({
          bilesen: { tip: s.tip, ref: s.ref },
          miktar: s.miktar,
          fire: s.fire,
          istasyon: s.istasyon,
        })),
      },
      `v${versiyonNo} sürümüne geri dönüldü`,
    );
  } catch {
    return { ok: false, error: "Geri yükleme başarısız." };
  }
}

export async function parcaSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.parca.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Başka reçetede/modelde kullanılan parça silinemez.",
    };
  }
}

/** Depo ekle/güncelle (id varsa upsert). Yeni kayıt için DEP-## kodu üretir. */
export async function depoKaydet(
  d: Depo,
): Promise<{ ok: boolean; id: string }> {
  let id = d.id;
  if (!id) {
    const mevcut = await db.depo.findMany({ select: { id: true } });
    let maxNo = 0;
    for (const r of mevcut) {
      const m = /^DEP-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    id = `DEP-${String(maxNo + 1).padStart(2, "0")}`;
  }
  const veri = {
    ad: d.ad,
    sehir: d.sehir,
    kapasite: d.kapasite,
    doluluk: d.doluluk,
    durum: d.durum,
  };
  await db.depo.upsert({
    where: { id },
    create: { id, ...veri },
    update: veri,
  });
  revalidatePath("/stok-yonetimi");
  return { ok: true, id };
}

export async function depoSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.depo.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch {
    return { ok: false, error: "Depo silinemedi." };
  }
}

/** Poşet ekle/güncelle + içeriğini (poset_malzeme) yeniden yaz. POS-## üretir. */
export async function posetKaydet(
  p: Poset,
): Promise<{ ok: boolean; id: string; error?: string }> {
  try {
    let id = p.id;
    if (!id) {
      const mevcut = await db.poset.findMany({ select: { id: true } });
      let maxNo = 0;
      for (const r of mevcut) {
        const m = /^POS-(\d+)$/.exec(r.id);
        if (m) maxNo = Math.max(maxNo, Number(m[1]));
      }
      id = `POS-${String(maxNo + 1).padStart(2, "0")}`;
    }
    const posetId = id;
    await db.$transaction(async (tx) => {
      const veri = {
        ad: p.ad,
        aciklama: p.aciklama ?? null,
        durum: p.durum,
      };
      await tx.poset.upsert({
        where: { id: posetId },
        create: { id: posetId, ...veri },
        update: veri,
      });
      await tx.posetMalzeme.deleteMany({ where: { posetId } });
      const rows = p.malzemeler
        .filter((m) => m.malzemeId)
        .map((m) => ({ posetId, malzemeId: m.malzemeId, miktar: m.miktar }));
      if (rows.length) await tx.posetMalzeme.createMany({ data: rows });
    });
    revalidatePath("/uretim/poset");
    return { ok: true, id };
  } catch {
    return { ok: false, id: "", error: "Poşet kaydedilemedi." };
  }
}

export async function posetSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.poset.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/uretim/poset");
    return { ok: true };
  } catch {
    return { ok: false, error: "Poşet silinemedi." };
  }
}

/** Sabit tanımlı sistem parametresinin değerini kaydeder (upsert). */
export async function parametreDegerKaydet(
  anahtar: string,
  deger: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!anahtar.trim()) return { ok: false, error: "Anahtar gerekli." };
  try {
    await db.sistemParametre.upsert({
      where: { anahtar },
      create: { anahtar, deger },
      update: { deger },
    });
    revalidatePath("/ayarlar/parametreler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Parametre kaydedilemedi." };
  }
}

/** Parametreyi varsayılana döndürür (DB kaydını siler). */
export async function parametreSifirla(
  anahtar: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.sistemParametre.deleteMany({ where: { anahtar } });
    revalidatePath("/ayarlar/parametreler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Parametre sıfırlanamadı." };
  }
}

/** Liste kolon ayarını kaydeder: seçili ek kolonlar + gören kullanıcılar.
 *  TODO: oturum altyapısı gelince yalnızca Yönetici rolüne izin ver. */
export async function listeKolonKaydet(
  listeId: string,
  ayar: { kolonlar: string[]; kullanicilar: string[]; gizliTemel: string[] },
  yol?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!listeId.trim()) return { ok: false, error: "Liste kimliği gerekli." };
  try {
    const kolonlarJson = JSON.stringify(ayar);
    await db.listeAyar.upsert({
      where: { listeId },
      create: { listeId, kolonlarJson },
      update: { kolonlarJson },
    });
    if (yol) revalidatePath(yol);
    return { ok: true };
  } catch {
    return { ok: false, error: "Kolon ayarı kaydedilemedi." };
  }
}

// ── Kullanıcı yönetimi ──────────────────────────────────────────────────

/** Yeni rol tanımı ekler (varsa sessizce geçer). */
export async function rolEkle(
  ad: string,
): Promise<{ ok: boolean; error?: string }> {
  const isim = ad.trim();
  if (!isim) return { ok: false, error: "Rol adı boş olamaz." };
  try {
    await db.rol.upsert({ where: { ad: isim }, create: { ad: isim }, update: {} });
    revalidatePath("/kullanicilar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Rol eklenemedi." };
  }
}

/** Bir kullanıcının tek modül yetki bayraklarını ayarlar (anında kaydetme). */
export async function kullaniciYetkiSet(
  kullaniciId: string,
  modul: string,
  yetki: ModulYetki,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.kullaniciYetki.upsert({
      where: { kullaniciId_modul: { kullaniciId, modul } },
      create: { kullaniciId, modul, ...yetki },
      update: { ...yetki },
    });
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Yetki kaydedilemedi." };
  }
}

/** Bir rolün tüm modül yetkilerini kaydeder (sil + yeniden yaz). */
export async function rolYetkiKaydet(
  rolAd: string,
  yetkiler: Record<string, ModulYetki>,
): Promise<{ ok: boolean; error?: string }> {
  if (!rolAd.trim()) return { ok: false, error: "Rol seçilmedi." };
  try {
    await db.$transaction(async (tx) => {
      await tx.rolYetki.deleteMany({ where: { rolAd } });
      const rows = Object.entries(yetkiler).map(([modul, y]) => ({
        rolAd,
        modul,
        ...y,
      }));
      if (rows.length) await tx.rolYetki.createMany({ data: rows });
    });
    revalidatePath("/kullanicilar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Yetkiler kaydedilemedi." };
  }
}

/** Yetki setini (izin şablonu) ekle/güncelle + detaylarını yeniden yaz. */
export async function yetkiSetiKaydet(seti: {
  id?: number;
  ad: string;
  yetkiler: Record<string, ModulYetki>;
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  const ad = seti.ad.trim();
  if (!ad) return { ok: false, error: "Set adı gerekli." };
  try {
    const id = await db.$transaction(async (tx) => {
      let setId = seti.id;
      if (setId) {
        await tx.yetkiSeti.update({ where: { id: setId }, data: { ad } });
      } else {
        const olusan = await tx.yetkiSeti.create({ data: { ad } });
        setId = olusan.id;
      }
      await tx.yetkiSetiDetay.deleteMany({ where: { setId } });
      const rows = Object.entries(seti.yetkiler).map(([modul, y]) => ({
        setId: setId!,
        modul,
        ...y,
      }));
      if (rows.length) await tx.yetkiSetiDetay.createMany({ data: rows });
      return setId!;
    });
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Set kaydedilemedi (ad benzersiz olmalı)." };
  }
}

export async function yetkiSetiSil(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.yetkiSeti.delete({ where: { id } });
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Set silinemedi." };
  }
}

/** Bir yetki setini kullanıcıya uygular (bayrakları kopyalar - snapshot). */
export async function yetkiSetiUygula(
  kullaniciId: string,
  setId: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const set = await db.yetkiSeti.findUnique({
      where: { id: setId },
      include: { detaylar: true },
    });
    if (!set) return { ok: false, error: "Set bulunamadı." };
    await db.$transaction(async (tx) => {
      for (const d of set.detaylar) {
        const y = {
          isList: d.isList,
          isAdd: d.isAdd,
          isUpdate: d.isUpdate,
          isDelete: d.isDelete,
        };
        await tx.kullaniciYetki.upsert({
          where: { kullaniciId_modul: { kullaniciId, modul: d.modul } },
          create: { kullaniciId, modul: d.modul, ...y },
          update: y,
        });
      }
    });
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Set uygulanamadı." };
  }
}

/** Bir kullanıcının bir cariye görüntüle/işlem yetkisini ayarlar.
 *  İkisi de açıksa kayıt silinir (varsayılan tam erişim). */
export async function cariYetkiAyarla(
  kullaniciId: string,
  cariId: string,
  goruntule: boolean,
  islemYap: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (goruntule && islemYap) {
      await db.kullaniciCariYetki.deleteMany({ where: { kullaniciId, cariId } });
    } else {
      await db.kullaniciCariYetki.upsert({
        where: { kullaniciId_cariId: { kullaniciId, cariId } },
        create: { kullaniciId, cariId, goruntule, islemYap },
        update: { goruntule, islemYap },
      });
    }
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Cari yetkisi kaydedilemedi." };
  }
}

/** Birden fazla cari için görüntüle/işlem yetkisini toplu ayarlar. */
export async function cariYetkiTopluAyarla(
  kullaniciId: string,
  ogeler: { cariId: string; goruntule: boolean; islemYap: boolean }[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      for (const o of ogeler) {
        if (o.goruntule && o.islemYap) {
          await tx.kullaniciCariYetki.deleteMany({
            where: { kullaniciId, cariId: o.cariId },
          });
        } else {
          await tx.kullaniciCariYetki.upsert({
            where: { kullaniciId_cariId: { kullaniciId, cariId: o.cariId } },
            create: {
              kullaniciId,
              cariId: o.cariId,
              goruntule: o.goruntule,
              islemYap: o.islemYap,
            },
            update: { goruntule: o.goruntule, islemYap: o.islemYap },
          });
        }
      }
    });
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Cari yetkisi kaydedilemedi." };
  }
}

/** Yeni departman tanımı ekler (varsa sessizce geçer). */
export async function departmanEkle(
  ad: string,
): Promise<{ ok: boolean; error?: string }> {
  const isim = ad.trim();
  if (!isim) return { ok: false, error: "Departman adı boş olamaz." };
  try {
    await db.departman.upsert({
      where: { ad: isim },
      create: { ad: isim },
      update: {},
    });
    revalidatePath("/kullanicilar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Departman eklenemedi." };
  }
}

export type KullaniciKayit = {
  id?: string;
  adSoyad: string;
  email?: string;
  telefon?: string;
  departman?: string;
  rol: string;
  durum: "Aktif" | "Pasif";
  /** Geçmiş tarihe işlem girebilme yetkisi. */
  eskiTarihliIslem?: boolean;
  /** Yeni kayıtta zorunlu; düzenlemede boş bırakılırsa şifre değişmez. */
  sifre?: string;
};

/** Ad soyaddan giriş için kullanıcı adı üretir: "Ahmet Yılmaz" → "ahmet.yilmaz". */
function kullaniciAdiUret(adSoyad: string): string {
  const tr: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return adSoyad
    .trim()
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (c) => tr[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

/**
 * Kullanıcı ekle/güncelle. Yeni kayıtta USR-#### ve ad soyaddan benzersiz
 * kullanıcı adı üretir, şifreyi hash'ler. Düzenlemede kullanıcı adı değişmez.
 */
export async function kullaniciKaydet(
  k: KullaniciKayit,
): Promise<{ ok: boolean; id?: string; kullaniciAdi?: string; error?: string }> {
  try {
    const ortak = {
      adSoyad: k.adSoyad.trim(),
      email: k.email?.trim() || null,
      telefon: k.telefon?.trim() || null,
      departman: k.departman?.trim() || null,
      rol: k.rol,
      durum: k.durum,
      eskiTarihliIslem: k.eskiTarihliIslem ?? false,
    };

    if (k.id) {
      const g = await db.kullanici.update({
        where: { id: k.id },
        data: {
          ...ortak,
          // Şifre yalnızca yeni bir değer girildiyse güncellenir.
          ...(k.sifre ? { sifreHash: sifreHashle(k.sifre) } : {}),
        },
      });
      revalidatePath("/kullanicilar");
      return { ok: true, id: k.id, kullaniciAdi: g.kullaniciAdi };
    }

    if (!k.sifre) return { ok: false, error: "Şifre zorunludur." };

    const mevcut = await db.kullanici.findMany({
      select: { id: true, kullaniciAdi: true },
    });
    let maxNo = 1000;
    for (const r of mevcut) {
      const m = /^USR-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    const id = `USR-${maxNo + 1}`;

    // Benzersiz kullanıcı adı: ahmet.yilmaz, doluysa ahmet.yilmaz2, 3...
    const taban = kullaniciAdiUret(k.adSoyad) || "kullanici";
    const alinmis = new Set(mevcut.map((r) => r.kullaniciAdi));
    let kullaniciAdi = taban;
    for (let n = 2; alinmis.has(kullaniciAdi); n++) kullaniciAdi = `${taban}${n}`;

    await db.kullanici.create({
      data: {
        id,
        kullaniciAdi,
        ...ortak,
        sifreHash: sifreHashle(k.sifre),
        olusturma: tarihDate(new Date().toISOString().slice(0, 10)),
      },
    });
    revalidatePath("/kullanicilar");
    return { ok: true, id, kullaniciAdi };
  } catch (e) {
    // Prisma P2002: unique ihlali (kullanici_adi)
    if ((e as { code?: string })?.code === "P2002")
      return { ok: false, error: "Bu kullanıcı adı zaten kullanılıyor." };
    return { ok: false, error: "Kullanıcı kaydedilemedi." };
  }
}

export async function kullaniciSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    await db.kullanici.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/kullanicilar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Kullanıcı silinemedi." };
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

/** Sıradaki sayısal cari kodu (1001'den başlar). */
export async function sonrakiCariKodu(): Promise<string> {
  const mevcut = await db.cari.findMany({ select: { id: true } });
  let maxNo = 1000;
  for (const r of mevcut) {
    if (/^\d+$/.test(r.id)) maxNo = Math.max(maxNo, Number(r.id));
  }
  return String(maxNo + 1);
}

/**
 * Cari ekle/güncelle. `yeni: true` → kod SUNUCUDA üretilir (formdaki değer
 * önizlemedir; yarış durumunda çakışma olmaz), aksi halde mevcut kayıt
 * güncellenir. Kodlar düz rakamdır (1001, 1002...).
 */
export async function cariKaydet(
  c: Cari,
  yeni = false,
): Promise<{ ok: boolean; id: string }> {
  const id = yeni ? await sonrakiCariKodu() : c.id;
  const ortak = {
    ad: c.ad,
    tamAd: c.tamAd ?? null,
    tip: c.tip,
    sinif: c.sinif,
    yetkili: c.yetkili ?? null,
    yetkiliUnvan: c.yetkiliUnvan ?? null,
    yetkiliTelefon: c.yetkiliTelefon ?? null,
    yetkiliEmail: c.yetkiliEmail ?? null,
    telefon: c.telefon ?? null,
    telefon2: c.telefon2 ?? null,
    telefon3: c.telefon3 ?? null,
    fax: c.fax ?? null,
    email: c.email ?? null,
    webSite: c.webSite ?? null,
    satisFiyatTipi: c.satisFiyatTipi ?? "Satış Fiyatı 1",
    iskontoOrani: c.iskontoOrani ?? 0,
    temsilci: c.temsilci ?? null,
    sube: c.sube ?? null,
    muhasebeKodu: c.muhasebeKodu ?? null,
    tcKimlik: c.tcKimlik ?? null,
    vergiNo: c.vergiNo ?? null,
    vergiDairesi: c.vergiDairesi ?? null,
    unvan: c.unvan ?? null,
    ulke: c.ulke ?? null,
    bolge: c.bolge ?? null,
    sehir: c.sehir ?? null,
    semt: c.semt ?? null,
    adres: c.adres ?? null,
    paraBirimi: c.paraBirimi,
    durum: c.durum,
    not: c.not ?? null,
  };
  if (yeni) {
    // bakiye'yi düz kaydette değiştirmiyoruz (işlemler yönetir) — yeni kayıtta 0.
    await db.cari.create({ data: { id, ...ortak, bakiye: c.bakiye } });
  } else {
    await db.cari.update({ where: { id }, data: ortak });
  }
  revalidatePath("/cari");
  return { ok: true, id };
}

export async function cariSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  try {
    // cari_islem cascade ile silinir.
    await db.cari.deleteMany({ where: { id: { in: ids } } });
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
    const mevcut = await db.cariIslem.findMany({ select: { id: true } });
    let maxNo = 3000;
    for (const r of mevcut) {
      const m = /^CI-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    const id = `CI-${maxNo + 1}`;

    await db.$transaction(async (tx) => {
      await tx.cariIslem.create({
        data: {
          id,
          cariId,
          tarih: tarihDate(yeni.tarih),
          tur: yeni.tur,
          tutar: yeni.tutar,
          belge: yeni.belge ?? null,
          aciklama: yeni.aciklama,
        },
      });
      const c = await tx.cari.findUnique({
        where: { id: cariId },
        select: { bakiye: true },
      });
      const yeniBakiye =
        Number(c?.bakiye ?? 0) + bakiyeEtkisi(yeni.tur, yeni.tutar);
      await tx.cari.update({
        where: { id: cariId },
        data: { bakiye: yeniBakiye },
      });
    });

    revalidatePath("/cari");
    revalidatePath(`/cari/${cariId}`);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "İşlem eklenemedi." };
  }
}

// ── Stok grup ağacı (Tanımlamalar → Gruplar) ─────────────────────────────

/** Grup ekle/güncelle. ustId null → kök grup. */
export async function grupKaydet(g: {
  id?: string;
  ad: string;
  kod: string;
  ustId: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    if (g.id) {
      await db.grup.update({
        where: { id: g.id },
        data: { ad: g.ad, kod: g.kod },
      });
      revalidatePath("/stok-yonetimi");
      return { ok: true, id: g.id };
    }
    const yeni = await db.grup.create({
      data: { ad: g.ad, kod: g.kod, ustId: g.ustId },
    });
    revalidatePath("/stok-yonetimi");
    return { ok: true, id: yeni.id };
  } catch (e) {
    console.error("grupKaydet:", e);
    return { ok: false, error: "Grup kaydedilemedi." };
  }
}

/** Grubu siler; alt grubu varsa reddeder. */
export async function grupSil(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const altSayisi = await db.grup.count({ where: { ustId: id } });
    if (altSayisi > 0)
      return { ok: false, error: "Önce alt grupları silin." };
    await db.grup.delete({ where: { id } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("grupSil:", e);
    return { ok: false, error: "Grup silinemedi." };
  }
}

// ── Düz tanımlar (marka/koleksiyon/renk/kumaş/birim) ─────────────────────

/** Tanım ekle/güncelle. */
export async function tanimKaydet(
  tip: TanimTip,
  t: { id?: string; ad: string; durum: "Aktif" | "Pasif" },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    if (t.id) {
      await db.tanim.update({
        where: { id: t.id },
        data: { ad: t.ad, durum: t.durum },
      });
      revalidatePath("/stok-yonetimi");
      return { ok: true, id: t.id };
    }
    const yeni = await db.tanim.create({
      data: { tip, ad: t.ad, durum: t.durum },
    });
    revalidatePath("/stok-yonetimi");
    return { ok: true, id: yeni.id };
  } catch (e) {
    console.error("tanimKaydet:", e);
    return { ok: false, error: "Tanım kaydedilemedi (aynı ad olabilir)." };
  }
}

/** Tanımları siler. */
export async function tanimSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.tanim.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("tanimSil:", e);
    return { ok: false, error: "Tanım silinemedi." };
  }
}

// ── Cari kart alt kayıtları (banka / şube / yetkili / CRM / doküman) ─────

type CariAltSonuc = { ok: boolean; id?: number; error?: string };

/** Banka hesabı ekle/güncelle. */
export async function cariBankaKaydet(
  b: Omit<CariBanka, "id"> & { id?: number },
): Promise<CariAltSonuc> {
  try {
    const veri = {
      cariId: b.cariId,
      bankaAdi: b.bankaAdi,
      sube: b.sube ?? null,
      iban: b.iban ?? null,
      aciklama: b.aciklama ?? null,
    };
    const kayit = b.id
      ? await db.cariBanka.update({ where: { id: b.id }, data: veri })
      : await db.cariBanka.create({ data: veri });
    revalidatePath(`/cari/${b.cariId}`);
    return { ok: true, id: kayit.id };
  } catch (e) {
    console.error("cariBankaKaydet:", e);
    return { ok: false, error: "Banka hesabı kaydedilemedi." };
  }
}

export async function cariBankaSil(id: number, cariId: string): Promise<CariAltSonuc> {
  try {
    await db.cariBanka.delete({ where: { id } });
    revalidatePath(`/cari/${cariId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Banka hesabı silinemedi." };
  }
}

/** Cari şubesi ekle/güncelle. */
export async function cariSubeKaydet(
  s: Omit<CariSube, "id"> & { id?: number },
): Promise<CariAltSonuc> {
  try {
    const veri = {
      cariId: s.cariId,
      subeAdi: s.subeAdi,
      yetkili: s.yetkili ?? null,
      email: s.email ?? null,
      telefon: s.telefon ?? null,
      aciklama: s.aciklama ?? null,
      ulke: s.ulke ?? null,
      sehir: s.sehir ?? null,
      semt: s.semt ?? null,
      adres: s.adres ?? null,
    };
    const kayit = s.id
      ? await db.cariSube.update({ where: { id: s.id }, data: veri })
      : await db.cariSube.create({ data: veri });
    revalidatePath(`/cari/${s.cariId}`);
    return { ok: true, id: kayit.id };
  } catch (e) {
    console.error("cariSubeKaydet:", e);
    return { ok: false, error: "Şube kaydedilemedi." };
  }
}

export async function cariSubeSil(id: number, cariId: string): Promise<CariAltSonuc> {
  try {
    await db.cariSube.delete({ where: { id } });
    revalidatePath(`/cari/${cariId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Şube silinemedi." };
  }
}

/** Cari yetkilisi ekle/güncelle. */
export async function cariYetkiliKaydet(
  y: Omit<CariYetkili, "id"> & { id?: number },
): Promise<CariAltSonuc> {
  try {
    const veri = {
      cariId: y.cariId,
      yetkili: y.yetkili,
      gorevi: y.gorevi ?? null,
      email: y.email ?? null,
      telefon: y.telefon ?? null,
      subeAdi: y.subeAdi ?? null,
      aciklama: y.aciklama ?? null,
    };
    const kayit = y.id
      ? await db.cariYetkili.update({ where: { id: y.id }, data: veri })
      : await db.cariYetkili.create({ data: veri });
    revalidatePath(`/cari/${y.cariId}`);
    return { ok: true, id: kayit.id };
  } catch (e) {
    console.error("cariYetkiliKaydet:", e);
    return { ok: false, error: "Yetkili kaydedilemedi." };
  }
}

export async function cariYetkiliSil(id: number, cariId: string): Promise<CariAltSonuc> {
  try {
    await db.cariYetkili.delete({ where: { id } });
    revalidatePath(`/cari/${cariId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Yetkili silinemedi." };
  }
}

/** CRM kaydı ekle/güncelle. */
export async function cariCrmKaydet(
  k: Omit<CariCrm, "id"> & { id?: number },
): Promise<CariAltSonuc> {
  try {
    const veri = {
      cariId: k.cariId,
      tarih: tarihDate(k.tarih),
      personel: k.personel ?? null,
      tip: k.tip,
      durum: k.durum,
      aciklama: k.aciklama ?? null,
    };
    const kayit = k.id
      ? await db.cariCrm.update({ where: { id: k.id }, data: veri })
      : await db.cariCrm.create({ data: veri });
    revalidatePath(`/cari/${k.cariId}`);
    return { ok: true, id: kayit.id };
  } catch (e) {
    console.error("cariCrmKaydet:", e);
    return { ok: false, error: "CRM kaydı kaydedilemedi." };
  }
}

export async function cariCrmSil(id: number, cariId: string): Promise<CariAltSonuc> {
  try {
    await db.cariCrm.delete({ where: { id } });
    revalidatePath(`/cari/${cariId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "CRM kaydı silinemedi." };
  }
}

/** Doküman/resim (URL) ekle. */
export async function cariDokumanKaydet(
  d: Omit<CariDokuman, "id"> & { id?: number },
): Promise<CariAltSonuc> {
  try {
    const veri = { cariId: d.cariId, ad: d.ad, url: d.url };
    const kayit = d.id
      ? await db.cariDokuman.update({ where: { id: d.id }, data: veri })
      : await db.cariDokuman.create({ data: veri });
    revalidatePath(`/cari/${d.cariId}`);
    return { ok: true, id: kayit.id };
  } catch (e) {
    console.error("cariDokumanKaydet:", e);
    return { ok: false, error: "Doküman kaydedilemedi." };
  }
}

export async function cariDokumanSil(id: number, cariId: string): Promise<CariAltSonuc> {
  try {
    await db.cariDokuman.delete({ where: { id } });
    revalidatePath(`/cari/${cariId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Doküman silinemedi." };
  }
}

// ── Satın alma ──────────────────────────────────────────────────────────

export type YeniAlisSatiri = {
  malzemeId: string;
  malzemeAd: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
};

export type YeniAlis = {
  cariId: string;
  cariAd: string;
  tarih: string;
  depo: string;
  belgeNo?: string;
  aciklama?: string;
  satirlar: YeniAlisSatiri[];
  /** true → satırdaki fiyat malzemenin birim fiyatına yazılır (son alış). */
  fiyatGuncelle?: boolean;
};

/**
 * Satın alma kaydı — tek transaction'da:
 *  1. alis + satırları yazılır (ALS-####)
 *  2. her satır: malzeme stoğu artar + stok hareketi (Giriş) yazılır
 *  3. cariye Alacak işlemi düşer (bakiye güncellenir)
 * Alış silme v1'de yok (stok/cari geri alma gerektirir).
 */
export async function alisKaydet(
  a: YeniAlis,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const satirlar = a.satirlar.filter((s) => s.malzemeId && s.miktar > 0);
  if (satirlar.length === 0)
    return { ok: false, error: "En az bir malzeme satırı gerekli." };
  if (!a.cariId) return { ok: false, error: "Tedarikçi seçin." };

  try {
    // Kod üretimleri (ALS-####, SH-####, CI-####)
    const [alisler, hareketler, islemler] = await Promise.all([
      db.alis.findMany({ select: { id: true } }),
      db.stokHareket.findMany({ select: { id: true } }),
      db.cariIslem.findMany({ select: { id: true } }),
    ]);
    const maxNo = (rows: { id: string }[], onEk: string, taban: number) => {
      let max = taban;
      const re = new RegExp(`^${onEk}-(\\d+)$`);
      for (const r of rows) {
        const m = re.exec(r.id);
        if (m) max = Math.max(max, Number(m[1]));
      }
      return max;
    };
    const alisId = `ALS-${maxNo(alisler, "ALS", 1000) + 1}`;
    let shNo = maxNo(hareketler, "SH", 3000);
    const ciId = `CI-${maxNo(islemler, "CI", 3000) + 1}`;

    const toplam = satirlar.reduce(
      (t, s) => t + s.miktar * s.birimFiyat,
      0,
    );
    const tarih = tarihDate(a.tarih);

    await db.$transaction(async (tx) => {
      // 1) Alış + satırlar
      await tx.alis.create({
        data: {
          id: alisId,
          cariId: a.cariId,
          cariAd: a.cariAd,
          tarih,
          depo: a.depo,
          belgeNo: a.belgeNo ?? null,
          aciklama: a.aciklama ?? null,
          toplam,
          satirlar: {
            create: satirlar.map((s) => ({
              malzemeId: s.malzemeId,
              malzemeAd: s.malzemeAd,
              miktar: s.miktar,
              birim: s.birim,
              birimFiyat: s.birimFiyat,
            })),
          },
        },
      });

      // 2) Stok girişleri + hareketler (+ opsiyonel fiyat güncelleme)
      for (const s of satirlar) {
        await tx.malzeme.update({
          where: { id: s.malzemeId },
          data: {
            stok: { increment: s.miktar },
            ...(a.fiyatGuncelle ? { birimFiyat: s.birimFiyat } : {}),
          },
        });
        shNo += 1;
        await tx.stokHareket.create({
          data: {
            id: `SH-${shNo}`,
            tarih,
            tur: "Giriş",
            refTip: "malzeme",
            refId: s.malzemeId,
            miktar: s.miktar,
            birim: s.birim,
            depo: a.depo,
            aciklama: `Satın alma ${alisId} — ${a.cariAd}`,
          },
        });
      }

      // 3) Cari Alacak işlemi + bakiye
      await tx.cariIslem.create({
        data: {
          id: ciId,
          cariId: a.cariId,
          tarih,
          tur: "Alacak",
          tutar: toplam,
          belge: a.belgeNo ?? alisId,
          aciklama: `Satın alma ${alisId} (${satirlar.length} kalem)`,
        },
      });
      const c = await tx.cari.findUnique({
        where: { id: a.cariId },
        select: { bakiye: true },
      });
      await tx.cari.update({
        where: { id: a.cariId },
        data: { bakiye: Number(c?.bakiye ?? 0) + toplam },
      });
    });

    revalidatePath("/satin-alma");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/cari");
    revalidatePath(`/cari/${a.cariId}`);
    return { ok: true, id: alisId };
  } catch (e) {
    console.error("alisKaydet:", e);
    return { ok: false, error: "Alış kaydedilemedi." };
  }
}
