"use server";

import { revalidatePath } from "next/cache";

import { db, tarihDate } from "./index";
import { sifreHashle } from "./sifre";
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
  revalidatePath("/uretim/emirler");

  return { ok: true, ids: rows.map((r) => r.id) };
}

/** Malzeme ekle/güncelle (id varsa upsert). */
export async function malzemeKaydet(m: Malzeme): Promise<{ ok: boolean }> {
  const veri = {
    ad: m.ad,
    tip: m.tip,
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
};

function receteSnapshot(recete: Parca["recete"]): ReceteSnapshotSatir[] {
  return recete.map((r) => ({
    tip: r.bilesen.tip,
    ref: r.bilesen.ref,
    miktar: r.miktar,
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

/** Bir kullanıcının tek bir cariye erişimini ayarlar (izinli=engeli kaldır). */
export async function cariErisimAyarla(
  kullaniciId: string,
  cariId: string,
  izinli: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (izinli) {
      await db.kullaniciCariEngel.deleteMany({
        where: { kullaniciId, cariId },
      });
    } else {
      await db.kullaniciCariEngel.upsert({
        where: { kullaniciId_cariId: { kullaniciId, cariId } },
        create: { kullaniciId, cariId },
        update: {},
      });
    }
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Cari erişimi kaydedilemedi." };
  }
}

/** Bir kullanıcının verilen carilere erişimini toplu ayarlar. */
export async function cariErisimTopluAyarla(
  kullaniciId: string,
  cariIds: string[],
  izinli: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      await tx.kullaniciCariEngel.deleteMany({
        where: { kullaniciId, cariId: { in: cariIds } },
      });
      if (!izinli && cariIds.length) {
        await tx.kullaniciCariEngel.createMany({
          data: cariIds.map((cariId) => ({ kullaniciId, cariId })),
        });
      }
    });
    revalidatePath("/kullanicilar/yetkiler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Cari erişimi kaydedilemedi." };
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

/** Cari ekle/güncelle (id varsa upsert). Yeni kayıtta CARI-#### üretir. */
export async function cariKaydet(c: Cari): Promise<{ ok: boolean; id: string }> {
  let id = c.id;
  if (!id) {
    const mevcut = await db.cari.findMany({ select: { id: true } });
    let maxNo = 1000;
    for (const r of mevcut) {
      const m = /^CARI-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    id = `CARI-${maxNo + 1}`;
  }
  const ortak = {
    ad: c.ad,
    tip: c.tip,
    sinif: c.sinif,
    vergiNo: c.vergiNo ?? null,
    vergiDairesi: c.vergiDairesi ?? null,
    telefon: c.telefon ?? null,
    email: c.email ?? null,
    adres: c.adres ?? null,
    sehir: c.sehir ?? null,
    paraBirimi: c.paraBirimi,
    durum: c.durum,
    not: c.not ?? null,
  };
  await db.cari.upsert({
    where: { id },
    create: { id, ...ortak, bakiye: c.bakiye },
    // bakiye'yi düz kaydette değiştirmiyoruz (işlemler yönetir) — yeni kayıtta 0.
    update: ortak,
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
