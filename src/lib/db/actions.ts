"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db, tarihDate } from "./index";
import { getOturum } from "@/lib/oturum";
import { sayacHazirla, sonrakiNo } from "./sayac";
import {
  donusumVar,
  satirTutari,
  stokBirimFiyati,
  stokMiktarina,
  type BirimBilgisi,
} from "../birim";

/**
 * Mevcut en büyük SH numarası — sayaç ilk kez kurulurken kullanılır.
 * SH serisi TEK kaynaktan (sayaç) gelmeli; stok motoru da aynı seriyi
 * kullanıyor, iki ayrı üretici olsaydı numaralar er geç çakışırdı.
 */
async function enBuyukSH(): Promise<number> {
  const rows = await db.stokHareket.findMany({ select: { id: true } });
  let max = 1000;
  for (const r of rows) {
    const m = /^SH-(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
import { yetkiVarMi } from "@/lib/yetki-sunucu";
import {
  stokSilinebilirMi,
  cariSilinebilirMi,
  parcaSilinebilirMi,
  depoSilinebilirMi,
  tanimSilinebilirMi,
  grupSilinebilirMi,
  istasyonSilinebilirMi,
  kullaniciSilinebilirMi,
  type SilmeSonucu,
} from "./silme-kontrol";
import { ean13, kodBarkod } from "@/lib/barkod";
import { sifreHashle } from "./sifre";
import { type IstasyonSlug } from "../fabrika";

/** Üretim rotası — istasyon slug'ları (DB, sira sırasıyla); boşsa varsayılan. */
async function rotaSluglari(): Promise<string[]> {
  const rows = await db.istasyon.findMany({
    orderBy: { sira: "asc" },
    select: { id: true },
  });
  return rows.length > 0
    ? rows.map((r) => r.id)
    : ["kesim", "bantlama", "delik", "montaj", "paketleme", "sevkiyat"];
}
import {
  emirHareketleriniIadeEt,
  istasyonDusumu,
  mamulGirisi,
  parametreDegeri,
  stokDuzeltmeYaz,
  uretimeGecisDusumu,
  type EksikMalzeme,
  type StokDuzeltSonuc,
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
  StokKarti,
  StokUretici,
  StokMusteri,
  StokDokuman,
} from "../data";

export type YeniUretimEmri = {
  /** "model" (mamül kartı) | "parca" (parça üretimi). Varsayılan model. */
  refTip?: "model" | "parca";
  urunId: string;
  urunAd: string;
  adet: number;
  durum: Extract<UretimDurum, "Üretimde" | "Planlandı">;
  oncelik?: UretimOncelik;
  terminBaslangic?: string;
  termin?: string;
  musteri?: string;
  hedefDepo?: string;
  not?: string;
};

function bugun(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bir veya daha fazla üretim emrini DB'ye yazar; sonraki UE-#### kodlarını üretir. */

/**
 * Action'lar için yetki koruması.
 *
 * Hata FIRLATMAZ, sonuç döndürür: bu action'lar { ok, error } sözleşmesiyle
 * çağrılıyor ve istemci hatayı toast ile gösteriyor; throw edilseydi
 * kullanıcı ham "unhandled error" ekranı görürdü.
 * İzin varsa null döner.
 */
async function yetkiKorumasi(
  modul: string,
  bayrak: "isList" | "isAdd" | "isUpdate" | "isDelete",
): Promise<{ ok: false; error: string } | null> {
  const o = await getOturum();
  if (!o) return { ok: false, error: "Oturum bulunamadı. Tekrar giriş yapın." };
  if (await yetkiVarMi(modul, bayrak, o)) return null;
  return { ok: false, error: "Bu işlem için yetkiniz yok." };
}


export async function uretimEmriOlustur(
  yeniler: YeniUretimEmri[],
  /** Emirleri doğuran satın alma talebi — emir no talebe yazılır. */
  talepId?: string,
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
    refTip: y.refTip ?? "model",
    modelId: y.urunId,
    modelAd: y.urunAd,
    adet: y.adet,
    durum: y.durum,
    oncelik: y.oncelik ?? "Normal",
    olusturma: tarihDate(tarih),
    terminBaslangic: y.terminBaslangic ? tarihDate(y.terminBaslangic) : null,
    termin: y.termin ? tarihDate(y.termin) : null,
    musteri: y.musteri ?? null,
    hedefDepo: y.hedefDepo ?? null,
    not: y.not ?? null,
  }));

  await db.uretimEmri.createMany({ data: rows });

  // Fabrika rotası: her emir için istasyon adımlarını oluştur (DB istasyonları).
  // "Üretimde" başlayan emirde ilk adım hemen İşleniyor olur.
  const rota = await rotaSluglari();
  await db.uretimEmriAdim.createMany({
    data: rows.flatMap((r) =>
      rota.map((istasyon, i) => ({
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
      refTip: r.refTip as "model" | "parca",
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

  // Talepten doğan emirlerin numarasını talebe iliştir (çift yönlü iz).
  if (talepId) {
    const talep = await db.satinAlmaTalep.findUnique({
      where: { id: talepId },
      select: { uretimEmirleri: true },
    });
    if (talep) {
      const mevcutEmirler = (talep.uretimEmirleri ?? "")
        .split(",")
        .filter(Boolean);
      for (const r of rows)
        if (!mevcutEmirler.includes(r.id)) mevcutEmirler.push(r.id);
      await db.satinAlmaTalep.update({
        where: { id: talepId },
        data: { uretimEmirleri: mevcutEmirler.join(",") },
      });
      revalidatePath("/satin-alma/talepler");
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
export async function emriIlerlet(
  emirId: string,
  /** Opsiyonel adım notu — tamamlanan (ya da başlatılan) adıma yazılır. */
  aciklama?: string,
  /** Rota dışı hedef istasyon (slug). Boşsa sıradaki adıma geçilir. */
  hedefIstasyon?: string,
): Promise<{
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
      refTip: emir.refTip as "model" | "parca",
      modelId: emir.modelId,
      modelAd: emir.modelAd,
      adet: emir.adet,
      // Mamul girişi emrin hedef deposuna yazılsın (alan vardı, okunmuyordu).
      hedefDepo: emir.hedefDepo,
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

      // Hedef verildiyse o adımdan başla; öncesindeki adımlar atlanır.
      const hedefAdim = hedefIstasyon
        ? adimlar.find((a) => a.istasyon === hedefIstasyon)
        : undefined;
      const ilkBekleyen =
        hedefAdim ?? adimlar.find((a) => a.durum === "Bekliyor");
      if (ilkBekleyen) {
        await db.$transaction(async (tx) => {
          if (hedefAdim)
            await tx.uretimEmriAdim.updateMany({
              where: {
                emirId,
                sira: { lt: hedefAdim.sira },
                durum: "Bekliyor",
              },
              data: { durum: "Atlandı" },
            });
          await tx.uretimEmriAdim.update({
            where: { id: ilkBekleyen.id },
            data: {
              durum: "İşleniyor",
              baslangic: simdi,
              not: aciklama?.trim() || null,
            },
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
          data: {
            durum: "Tamamlandı",
            bitis: simdi,
            // Not girildiyse yaz; girilmediyse önceki notu koru.
            ...(aciklama?.trim() ? { not: aciklama.trim() } : {}),
          },
        });
        // Hedef seçildiyse oraya geç; yoksa sıradaki adım.
        const hedefAdim = hedefIstasyon
          ? adimlar.find((a) => a.istasyon === hedefIstasyon)
          : undefined;
        const sonraki =
          hedefAdim ?? adimlar.find((a) => a.sira === isleniyor.sira + 1);
        if (sonraki) {
          if (hedefAdim) {
            if (hedefAdim.sira > isleniyor.sira) {
              // İleri atlama: aradaki bekleyen adımlar "Atlandı".
              await tx.uretimEmriAdim.updateMany({
                where: {
                  emirId,
                  sira: { gt: isleniyor.sira, lt: hedefAdim.sira },
                  durum: "Bekliyor",
                },
                data: { durum: "Atlandı" },
              });
            } else {
              // Geri dönüş (yeniden işleme): hedeften sonrası yeniden bekler.
              await tx.uretimEmriAdim.updateMany({
                where: { emirId, sira: { gt: hedefAdim.sira } },
                data: { durum: "Bekliyor", baslangic: null, bitis: null },
              });
            }
          }
          await tx.uretimEmriAdim.update({
            where: { id: sonraki.id },
            data: { durum: "İşleniyor", baslangic: simdi, bitis: null },
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
 * Düşülmüş stoklar ters kayıtla iade edilir (hareketler silinmez).
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

    // Önce iade, sonra durum: iade patlarsa emir açık kalsın ve tekrar
    // denenebilsin. Tersi sırada emir "İptal" görünürken stok geri gelmemiş
    // olurdu ve ikinci deneme "zaten iptal" diyerek iadeyi hiç yapmazdı.
    const iade = await emirHareketleriniIadeEt(emirId);
    await db.uretimEmri.update({
      where: { id: emirId },
      data: { durum: "İptal" },
    });
    if (iade.iadeEdilen > 0) revalidatePath("/stok-karti");
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

  const rota = await rotaSluglari();
  await db.uretimEmriAdim.createMany({
    data: eksikler.flatMap((e) =>
      rota.map((istasyon, i) => ({
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


/**
 * Yeni kartın açılış bakiyesini LEDGER'A yazar.
 *
 * Önceden açılış miktarı doğrudan stok.stokMiktar'a yazılıyordu; hareket
 * kaydı oluşmadığı için defter ile önbellek daha ilk günden ayrışıyordu
 * (stok takip ekranındaki bakiye kurgusu da bu yüzden tutmuyordu).
 *
 * Sıfır/negatif miktarda hareket yazılmaz — anlamsız kayıt üretmesin.
 */
async function acilisBakiyesiYaz(
  stokId: string,
  miktar: number,
  birim: string,
  refTip: "malzeme" | "model",
): Promise<void> {
  if (!Number.isFinite(miktar) || miktar <= 0) return;
  const depo = await parametreDegeri("varsayilan_depo");
  await sayacHazirla("SH", enBuyukSH);
  await db.$transaction(async (tx) => {
    await tx.stokHareket.create({
      data: {
        id: `SH-${await sonrakiNo(tx, "SH")}`,
        tarih: new Date(new Date().toISOString().slice(0, 10)),
        tur: "Giriş",
        refTip,
        refId: stokId,
        miktar,
        birim,
        depo,
        aciklama: "Açılış bakiyesi (kart oluşturma)",
      },
    });
    await tx.stok.update({
      where: { id: stokId },
      data: { stokMiktar: { increment: miktar } },
    });
  });
}

/** Malzeme ekle/güncelle → stok tablosu (grup Hammadde varsayılan). */
export async function malzemeKaydet(m: Malzeme): Promise<{ ok: boolean }> {
  const ortak = {
    ad: m.ad,
    altGrup: m.grup ?? null,
    stokBirimi: m.birim,
    alisBirimi: m.alisBirimi ?? null,
    alisCarpani: m.alisCarpani ?? null,
    alisFiyatBirimi: m.alisFiyatBirimi ?? null,
    maliyetFiyati: m.birimFiyat,
    ureticiCariId: m.tedarikci ?? null,
    durum: m.durum,
  };
  const vardi = await db.stok.findUnique({
    where: { id: m.id },
    select: { id: true },
  });
  await db.stok.upsert({
    where: { id: m.id },
    // Miktar 0 açılır; açılış bakiyesi hareket olarak yazılır (ledger tek kaynak).
    create: { id: m.id, grup: "Hammadde", stokMiktar: 0, ...ortak },
    update: ortak,
  });
  // Yalnız YENİ kartta: güncellemede miktara dokunulmaz, aksi halde her
  // kaydetmede açılış hareketi tekrar yazılırdı.
  if (!vardi) await acilisBakiyesiYaz(m.id, m.stok, m.birim, "malzeme");
  revalidatePath("/stok-yonetimi");
  return { ok: true };
}




// ── Stok sayımı ─────────────────────────────────────────────────────────

/**
 * Sayım belgesi açar ve o andaki kayıtlı miktarları satırlara kopyalar.
 *
 * "sistem" miktarı belge açılırken dondurulur: fark, sayımın YAPILDIĞI andaki
 * kayda göre hesaplanmalı. Tamamlarken canlı bakiyeden hesaplansaydı, sayım
 * ile tamamlama arasında olan üretim düşümleri farkın içine karışırdı.
 */
export async function sayimOlustur(girdi: {
  depo: string;
  tarih: string;
  aciklama?: string;
  /** Boş bırakılırsa aktif tüm stok kartları alınır. */
  gruplar?: string[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const izin = await yetkiKorumasi("stok", "isAdd");
  if (izin) return izin;
  try {
    const o = await getOturum();
    const kartlar = await db.stok.findMany({
      where: {
        durum: "Aktif",
        ...(girdi.gruplar?.length ? { grup: { in: girdi.gruplar } } : {}),
      },
      select: { id: true, ad: true, stokBirimi: true, stokMiktar: true },
      orderBy: { ad: "asc" },
    });
    if (kartlar.length === 0) {
      return { ok: false, error: "Sayıma alınacak aktif stok kartı yok." };
    }

    const sonuncu = await db.sayim.findFirst({ orderBy: { id: "desc" } });
    let no = 1000;
    const m = sonuncu ? /^SYM-(\d+)$/.exec(sonuncu.id) : null;
    if (m) no = Number(m[1]);
    const id = `SYM-${no + 1}`;

    await db.sayim.create({
      data: {
        id,
        tarih: tarihDate(girdi.tarih),
        depo: girdi.depo,
        aciklama: girdi.aciklama?.trim() || null,
        sorumlu: o?.adSoyad ?? null,
        olusturma: new Date(new Date().toISOString().slice(0, 10)),
        satirlar: {
          create: kartlar.map((k) => ({
            stokId: k.id,
            stokAd: k.ad,
            birim: k.stokBirimi,
            sistem: k.stokMiktar,
          })),
        },
      },
    });
    revalidatePath("/stok-yonetimi");
    return { ok: true, id };
  } catch (e) {
    console.error("sayimOlustur:", e);
    return { ok: false, error: "Sayım oluşturulamadı." };
  }
}

/** Bir satırın fiili sayımını kaydeder (null = sayılmadı işaretine döner). */
export async function sayimSatirKaydet(
  sayimId: string,
  stokId: string,
  sayilan: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const izin = await yetkiKorumasi("stok", "isUpdate");
  if (izin) return izin;
  try {
    const belge = await db.sayim.findUnique({ where: { id: sayimId } });
    if (!belge) return { ok: false, error: "Sayım bulunamadı." };
    if (belge.durum !== "Taslak") {
      return { ok: false, error: "Yalnızca taslak sayımda değişiklik yapılır." };
    }
    if (sayilan != null && (!Number.isFinite(sayilan) || sayilan < 0)) {
      return { ok: false, error: "Sayılan miktar geçersiz." };
    }
    await db.sayimSatiri.update({
      where: { sayimId_stokId: { sayimId, stokId } },
      data: { sayilan },
    });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("sayimSatirKaydet:", e);
    return { ok: false, error: "Satır kaydedilemedi." };
  }
}

/**
 * Sayımı tamamlar: farkları stok düzeltmesi olarak deftere yazar.
 *
 * Düzeltme stokDuzeltmeYaz üzerinden gider — bakiye doğrudan güncellenmez,
 * her fark için hareket oluşur ve iz kalır. O fonksiyon miktarı transaction
 * içinde taze okuduğu için, sayımdan sonra olan hareketler de hesaba katılır:
 * sayılan miktar hedeftir, aradaki değişim farka dönüşür.
 */
export async function sayimTamamla(
  sayimId: string,
): Promise<{ ok: boolean; duzeltilen?: number; error?: string }> {
  const izin = await yetkiKorumasi("stok", "isUpdate");
  if (izin) return izin;
  try {
    const belge = await db.sayim.findUnique({
      where: { id: sayimId },
      include: { satirlar: true },
    });
    if (!belge) return { ok: false, error: "Sayım bulunamadı." };
    if (belge.durum !== "Taslak") {
      return { ok: false, error: `Sayım zaten "${belge.durum}" durumunda.` };
    }
    const sayilanlar = belge.satirlar.filter((x) => x.sayilan != null);
    if (sayilanlar.length === 0) {
      return { ok: false, error: "Hiç satır sayılmamış." };
    }

    let duzeltilen = 0;
    for (const satir of sayilanlar) {
      const hedef = Number(satir.sayilan);
      // Fark eşiği dusumYaz ile aynı: 0.0005 altı Decimal(14,3) gürültüsü.
      if (Math.abs(hedef - Number(satir.sistem)) < 0.0005) continue;
      const res = await stokDuzeltmeYaz(
        satir.stokId,
        hedef,
        `Sayım ${belge.id}`,
      );
      // Bir kart düzeltilemezse (ör. negatif stok kapalı) sayım yarım kalmasın;
      // hata döndürüp tamamlanmamış bırakmak, düzeltilenleri de geri almayı
      // gerektirirdi. Sorunlu kart atlanır ve sayı raporlanır.
      if (res.ok) duzeltilen += 1;
    }

    await db.sayim.update({
      where: { id: sayimId },
      data: {
        durum: "Tamamlandı",
        tamamlama: new Date(new Date().toISOString().slice(0, 10)),
      },
    });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/stok-karti");
    return { ok: true, duzeltilen };
  } catch (e) {
    console.error("sayimTamamla:", e);
    return { ok: false, error: "Sayım tamamlanamadı." };
  }
}

/** Taslak sayımı siler; tamamlanmış sayım silinmez (defter izi kalmalı). */
export async function sayimSil(
  sayimId: string,
): Promise<{ ok: boolean; error?: string }> {
  const izin = await yetkiKorumasi("stok", "isDelete");
  if (izin) return izin;
  try {
    const belge = await db.sayim.findUnique({ where: { id: sayimId } });
    if (!belge) return { ok: false, error: "Sayım bulunamadı." };
    if (belge.durum === "Tamamlandı") {
      return {
        ok: false,
        error: "Tamamlanmış sayım silinemez — düzeltmeleri deftere işlendi.",
      };
    }
    await db.sayim.delete({ where: { id: sayimId } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("sayimSil:", e);
    return { ok: false, error: "Sayım silinemedi." };
  }
}

/** Engel detayının bir bölümü — modaldaki "kullanım yerleri" listesi. */
export type SilmeDetay = { baslik: string; ogeler: string[] };

/** Silme kontrolünde kullanılan varlık türleri. */
export type SilmeTipi =
  | "stok"
  | "cari"
  | "parca"
  | "depo"
  | "tanim"
  | "grup"
  | "istasyon"
  | "kullanici";

const SILME_KONTROL: Record<SilmeTipi, (id: string) => Promise<SilmeSonucu>> = {
  stok: stokSilinebilirMi,
  cari: cariSilinebilirMi,
  parca: parcaSilinebilirMi,
  depo: depoSilinebilirMi,
  tanim: tanimSilinebilirMi,
  grup: grupSilinebilirMi,
  istasyon: istasyonSilinebilirMi,
  kullanici: kullaniciSilinebilirMi,
};

/**
 * Silmeden ÖNCE çağrılır: kayıt(lar) silinebilir mi?
 * Amaç, olmayacak bir işlem için kullanıcıya "emin misiniz?" sormamak —
 * engel varsa onay sorulmadan sebep gösterilir. Silme action'ları bu
 * kontrolü ayrıca kendi içinde de yapar (istemciye güvenilmez).
 */
export async function silinebilirMi(
  tip: SilmeTipi,
  ids: string[],
): Promise<{ ok: boolean; error?: string; detaylar?: SilmeDetay[] }> {
  if (ids.length === 0) return { ok: true };
  const sonuclar = await Promise.all(ids.map((id) => SILME_KONTROL[tip](id)));
  const engelli = sonuclar.filter((r) => !r.silinebilir);
  if (engelli.length === 0) return { ok: true };

  // "Kullanım yerlerini göster" için bölüm listesi (kayıt → engel → örnekler).
  const detaylar: SilmeDetay[] = engelli.flatMap((r) =>
    r.engeller.map((e) => {
      const ogeler = [...(e.ornekler ?? [])];
      if (e.adet > ogeler.length && ogeler.length > 0)
        ogeler.push(`… ve ${e.adet - ogeler.length} kayıt daha`);
      return {
        baslik:
          engelli.length > 1
            ? `${r.ad ?? "?"} — ${e.etiket} (${e.adet})`
            : `${e.etiket} (${e.adet})`,
        ogeler,
      };
    }),
  );
  const error =
    engelli.length === 1
      ? (engelli[0].mesaj ?? "Kayıt silinemez.")
      : `${engelli.length} kayıt silinemez — işlem görmüş. Örn: ${engelli[0].mesaj ?? ""}`;
  return { ok: false, error, detaylar };
}

/**
 * Toplu silmede ön kontrol: her kayıt için kullanım denetimi çalıştırır.
 * Engellenen varsa HİÇBİRİ silinmez ve sebep döner — yarım silme olmaz.
 */
async function silmeOnKontrol(
  ids: string[],
  kontrol: (id: string) => Promise<SilmeSonucu>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sonuclar = await Promise.all(ids.map((id) => kontrol(id)));
  const engelli = sonuclar.filter((r) => !r.silinebilir);
  if (engelli.length === 0) return { ok: true };
  if (engelli.length === 1)
    return { ok: false, error: engelli[0].mesaj ?? "Kayıt silinemez." };
  return {
    ok: false,
    error: `${engelli.length} kayıt silinemez — işlem görmüş. Örn: ${engelli[0].mesaj ?? ""}`,
  };
}

export async function malzemeSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  const on = await silmeOnKontrol(ids, stokSilinebilirMi);
  if (!on.ok) return { ok: false, error: on.error };
  try {
    await db.stok.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch {
    return { ok: false, error: "Malzeme silinemedi." };
  }
}

/** Ürün ekle/güncelle → stok (grup Mamül) + BOM (model_parca). URN-#### üretir. */
export async function modelKaydet(u: Model): Promise<{ ok: boolean; id: string }> {
  let id = u.id;
  let barkod = u.barkod ?? null;
  // Yeni model: kod/barkod istemcide seçilen grup kodundan önizlenip gönderilir.
  // Emniyet: gelmezse (grup kodsuz/ırk durumu) sıradaki URN kodu üretilir.
  if (!id) {
    const kb = await grupSonrakiKod("");
    id = kb.kod;
    if (!barkod) barkod = kb.barkod;
  }
  const veri = {
    ad: u.ad,
    grup: "Mamül",
    kategori: u.kategori,
    satisFiyat1: u.fiyat,
    durum: u.durum,
    gorsel: u.gorsel ?? null,
    marka: u.marka ?? null,
    barkod,
    agirlik: u.agirlik ?? null,
    minStok: u.minStok ?? null,
    gorsellerJson: u.gorseller ? JSON.stringify(u.gorseller) : null,
    varyantlarJson: u.varyantlar ? JSON.stringify(u.varyantlar) : null,
  };
  const modelVardi = await db.stok.findUnique({
    where: { id },
    select: { id: true },
  });
  await db.$transaction(async (tx) => {
    await tx.stok.upsert({
      where: { id },
      // Miktar 0 açılır; açılış bakiyesi hareket olarak yazılır (ledger tek kaynak).
      create: { id, stokBirimi: "adet", stokMiktar: 0, ...veri },
      update: veri,
    });

    // BOM'u tamamen yeniden yaz (geçerli parcaId'leri olan satırlar).
    await tx.modelParca.deleteMany({ where: { modelId: id } });
    const bom = (u.parcalar ?? [])
      .filter((p) => p.parcaId)
      .map((p) => ({ modelId: id, parcaId: p.parcaId, miktar: p.miktar }));
    if (bom.length) await tx.modelParca.createMany({ data: bom });
  });

  // Yalnız YENİ modelde: güncellemede miktara dokunulmaz, aksi halde her
  // kaydetmede açılış hareketi tekrar yazılırdı.
  if (!modelVardi) await acilisBakiyesiYaz(id, u.stok ?? 0, "adet", "model");

  revalidatePath("/urunler");
  revalidatePath("/stok-yonetimi");
  revalidatePath("/");
  return { ok: true, id };
}

export async function modelSil(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: false };
  const on = await silmeOnKontrol(ids, stokSilinebilirMi);
  if (!on.ok) return { ok: false, error: on.error };
  try {
    await db.stok.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/urunler");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Model silinemedi." };
  }
}

/**
 * Elle stok düzeltme (sayım farkı). Miktarı ezmez — farkı Giriş/Çıkış
 * hareketine çevirir; gerekçe zorunludur. Motor: stokDuzeltmeYaz (db/stok.ts).
 */
export async function stokDuzelt(
  stokId: string,
  sayilanMiktar: number,
  aciklama: string,
): Promise<StokDuzeltSonuc> {
  const sonuc = await stokDuzeltmeYaz(stokId, sayilanMiktar, aciklama);
  if (sonuc.ok) {
    revalidatePath("/urunler");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/");
  }
  return sonuc;
}

/**
 * Model satış fiyatını (satisFiyat1) günceller. Tüm kartı yeniden yazan
 * modelKaydet yerine yalnız fiyatı dokunur — menüden hızlı fiyat düzeltme için.
 */
export async function modelFiyatGuncelle(
  id: string,
  yeniFiyat: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Model bulunamadı." };
  if (!Number.isFinite(yeniFiyat) || yeniFiyat < 0) {
    return { ok: false, error: "Fiyat geçersiz." };
  }
  try {
    await db.stok.update({
      where: { id },
      data: { satisFiyat1: yeniFiyat },
    });
    revalidatePath("/urunler");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Fiyat güncellenemedi." };
  }
}

/**
 * Model satış durumunu (Aktif/Pasif) günceller. Tek kolon — modelKaydet BOM'u
 * yeniden yazdığından (parcalar taşımayan liste satırıyla çağrılırsa reçeteyi
 * siler) menü işlemleri için ayrı ve güvenli bir yol.
 */
export async function modelDurumGuncelle(
  id: string,
  durum: "Aktif" | "Pasif",
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Model bulunamadı." };
  try {
    await db.stok.update({ where: { id }, data: { durum } });
    revalidatePath("/urunler");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Durum güncellenemedi." };
  }
}

/**
 * Model etiketlerini günceller. "cinsler" deseni: virgülle ayrılmış tek kolon.
 * Etiketler kırpılır, boşlar atılır, tekilleştirilir; hiç yoksa null yazılır.
 */
export async function modelEtiketGuncelle(
  id: string,
  etiketler: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Model bulunamadı." };
  const temiz = [
    ...new Set(etiketler.map((e) => e.trim()).filter(Boolean)),
  ];
  // Virgül ayraç olduğundan etiketin içinde virgül olamaz.
  if (temiz.some((e) => e.includes(","))) {
    return { ok: false, error: "Etiket virgül içeremez." };
  }
  try {
    await db.stok.update({
      where: { id },
      data: { etiketler: temiz.length ? temiz.join(",") : null },
    });
    revalidatePath("/urunler");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Etiketler güncellenemedi." };
  }
}

/**
 * Model favori (sabitleme) durumunu günceller. GLOBAL işaret — oturum yok;
 * auth gelince kullanıcıya taşınabilir.
 */
export async function modelFavoriGuncelle(
  id: string,
  favori: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Model bulunamadı." };
  try {
    await db.stok.update({ where: { id }, data: { favori } });
    revalidatePath("/urunler");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Favori güncellenemedi." };
  }
}

/** Model kategorisini günceller (tek kolon; BOM'a dokunmaz). */
export async function modelKategoriGuncelle(
  id: string,
  kategori: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Model bulunamadı." };
  try {
    await db.stok.update({ where: { id }, data: { kategori } });
    revalidatePath("/urunler");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Kategori güncellenemedi." };
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
  /** Bu parçanın bağlı olduğu modeller (verilirse ModelParca sıfırlanıp yazılır). */
  modelBaglari?: { modelId: string; miktar: number }[],
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
      const o = p.olculer;
      const veri = {
        ad: p.ad,
        kategori: p.kategori,
        aciklama: p.aciklama ?? null,
        durum: p.durum,
        // Refakat kağıdı ölçüleri (mm) — boş bırakılabilir.
        kabaUzunluk: o?.kabaUzunluk ?? null,
        kabaGenislik: o?.kabaGenislik ?? null,
        netUzunluk: o?.netUzunluk ?? null,
        netGenislik: o?.netGenislik ?? null,
        bitmisUzunluk: o?.bitmisUzunluk ?? null,
        bitmisGenislik: o?.bitmisGenislik ?? null,
        kalinlik: o?.kalinlik ?? null,
      };
      await tx.parca.upsert({
        where: { id: parcaId },
        create: { id: parcaId, ...veri },
        update: veri,
      });

      // İşlem sırası (refakat kağıdı): verilmişse tamamen yeniden yazılır.
      if (p.islemler) {
        await tx.parcaIslem.deleteMany({ where: { parcaId } });
        if (p.islemler.length)
          await tx.parcaIslem.createMany({
            data: p.islemler.map((i, idx) => ({
              parcaId,
              sira: i.sira || idx + 1,
              istasyon: i.istasyon,
              makineId: i.makineId ?? null,
              operasyon: i.operasyon,
              aciklama: i.aciklama ?? null,
            })),
          });
      }

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

      // Bağlı modeller verildiyse bu parçanın model üyeliklerini sıfırla + yaz.
      if (modelBaglari) {
        await tx.modelParca.deleteMany({ where: { parcaId } });
        const baglar = modelBaglari
          .filter((b) => b.modelId)
          .map((b) => ({ modelId: b.modelId, parcaId, miktar: b.miktar || 1 }));
        if (baglar.length) await tx.modelParca.createMany({ data: baglar });
      }
    });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    if (modelBaglari) {
      revalidatePath("/urunler");
      revalidatePath("/parcalar");
      revalidatePath("/");
    }
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
  const on = await silmeOnKontrol(ids, parcaSilinebilirMi);
  if (!on.ok) return { ok: false, error: on.error };
  try {
    await db.parca.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    return { ok: true };
  } catch {
    return { ok: false, error: "Parça silinemedi." };
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
  const on = await silmeOnKontrol(ids, depoSilinebilirMi);
  if (!on.ok) return { ok: false, error: on.error };
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
        refTip: p.refTip ?? null,
        refId: p.refId ?? null,
        paketParcaId: p.paketParcaId ?? null,
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
    return { ok: false, id: "", error: "Malzeme poşeti kaydedilemedi." };
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
    return { ok: false, error: "Malzeme poşeti silinemedi." };
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
 *  Ayar tüm kullanıcıları etkilediği için yönetim yetkisi ister. */
/**
 * Pano kısayollarını kullanıcı + departman bazında kaydeder.
 * Anahtar biçimi ve gerekçesi için bkz. getPanoKisayollari.
 */
export async function panoKisayolKaydet(
  departman: string,
  kisayollar: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Kimlik oturumdan: aksi halde biri başkasının pano düzenini ezebilirdi.
    const o = await getOturum();
    if (!o) return { ok: false, error: "Oturum bulunamadı." };
    const listeId = `pano-kisayol:${o.id}:${departman}`;
    const kolonlarJson = JSON.stringify({ kisayollar });
    await db.listeAyar.upsert({
      where: { listeId },
      create: { listeId, kolonlarJson },
      update: { kolonlarJson },
    });
    return { ok: true };
  } catch (e) {
    console.error("panoKisayolKaydet:", e);
    return { ok: false, error: "Kısayollar kaydedilemedi." };
  }
}

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
  // Başkasının yetkisini değiştirmek yönetim işidir; kimlik oturumdan gelir.
  const izin = await yetkiKorumasi("kullanicilar", "isUpdate");
  if (izin) return izin;
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
  // Başkasının yetkisini değiştirmek yönetim işidir; kimlik oturumdan gelir.
  const izin = await yetkiKorumasi("kullanicilar", "isUpdate");
  if (izin) return izin;
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
  // Başkasının yetkisini değiştirmek yönetim işidir; kimlik oturumdan gelir.
  const izin = await yetkiKorumasi("kullanicilar", "isUpdate");
  if (izin) return izin;
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
  // Başkasının yetkisini değiştirmek yönetim işidir; kimlik oturumdan gelir.
  const izin = await yetkiKorumasi("kullanicilar", "isUpdate");
  if (izin) return izin;
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
  /** Üretim departmanındaki kullanıcının çalıştığı istasyon. */
  istasyon?: string;
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
    const departman = k.departman?.trim() || null;
    const ortak = {
      adSoyad: k.adSoyad.trim(),
      email: k.email?.trim() || null,
      telefon: k.telefon?.trim() || null,
      departman,
      // İstasyon yalnızca Üretim departmanında anlamlı; değilse temizlenir.
      istasyon: departman === "Üretim" ? k.istasyon?.trim() || null : null,
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
  const on = await silmeOnKontrol(ids, kullaniciSilinebilirMi);
  if (!on.ok) return { ok: false, error: on.error };
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
  const on = await silmeOnKontrol(ids, cariSilinebilirMi);
  if (!on.ok) return { ok: false, error: on.error };
  try {
    // Alt kayıtlar (banka/şube/yetkili/CRM/doküman) cascade ile silinir.
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
/** Aynı üst grup altındaki grupları verilen id sırasına göre yeniden sıralar. */
export async function grupSiraKaydet(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.$transaction(
      ids.map((id, i) => db.grup.update({ where: { id }, data: { sira: i } })),
    );
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("grupSiraKaydet:", e);
    return { ok: false, error: "Sıra kaydedilemedi." };
  }
}

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
    // Yeni grup kolonun sonuna eklenir (sıra = mevcut kardeş sayısı).
    const kardesSayisi = await db.grup.count({ where: { ustId: g.ustId } });
    const yeni = await db.grup.create({
      data: { ad: g.ad, kod: g.kod, ustId: g.ustId, sira: kardesSayisi },
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
  const kontrol = await grupSilinebilirMi(id);
  if (!kontrol.silinebilir)
    return { ok: false, error: kontrol.mesaj ?? "Grup silinemez." };
  try {
    await db.grup.delete({ where: { id } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("grupSil:", e);
    return { ok: false, error: "Grup silinemedi." };
  }
}

// ── Üretim istasyonları (dinamik rota) ──────────────────────────────────

/** slug üret: ad → küçük harf, aksan/boşluk sadeleştir. */
function istasyonSlug(ad: string): string {
  return ad
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function istasyonKaydet(i: {
  id?: string;
  ad: string;
  sira: number;
  renk: string;
  konum: { x: number; z: number; g: number; d: number };
  durum?: "Aktif" | "Pasif";
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const veri = {
      ad: i.ad,
      sira: i.sira,
      renk: i.renk,
      konumX: i.konum.x,
      konumZ: i.konum.z,
      konumG: i.konum.g,
      konumD: i.konum.d,
      durum: i.durum ?? "Aktif",
    };
    if (i.id) {
      await db.istasyon.update({ where: { id: i.id }, data: veri });
      revalidatePath("/stok-yonetimi");
      return { ok: true, id: i.id };
    }
    // Yeni: slug'ı addan üret, çakışmada -2, -3 ekle.
    let id = istasyonSlug(i.ad) || "istasyon";
    const mevcut = new Set(
      (await db.istasyon.findMany({ select: { id: true } })).map((x) => x.id),
    );
    if (mevcut.has(id)) {
      let n = 2;
      while (mevcut.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    await db.istasyon.create({ data: { id, ...veri } });
    revalidatePath("/stok-yonetimi");
    return { ok: true, id };
  } catch (e) {
    console.error("istasyonKaydet:", e);
    return { ok: false, error: "İstasyon kaydedilemedi." };
  }
}

/** İstasyonların rota sırasını topluca günceller (sürükle-bırak). */
export async function istasyonSiraKaydet(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.$transaction(
      ids.map((id, i) =>
        db.istasyon.update({ where: { id }, data: { sira: i + 1 } }),
      ),
    );
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("istasyonSiraKaydet:", e);
    return { ok: false, error: "Sıralama kaydedilemedi." };
  }
}

export async function istasyonSil(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const kontrol = await istasyonSilinebilirMi(id);
  if (!kontrol.silinebilir)
    return { ok: false, error: kontrol.mesaj ?? "İstasyon silinemez." };
  try {
    await db.istasyon.delete({ where: { id } });
    revalidatePath("/stok-yonetimi");
    return { ok: true };
  } catch (e) {
    console.error("istasyonSil:", e);
    return { ok: false, error: "İstasyon silinemedi." };
  }
}

// ── Makineler (istasyona bağlı tezgahlar) ───────────────────────────────

/** Makine ekle/güncelle. */
export async function makineKaydet(m: {
  id?: number;
  ad: string;
  istasyon: string;
  sira?: number;
  durum?: "Aktif" | "Pasif";
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  if (!m.ad.trim()) return { ok: false, error: "Makine adı gerekli." };
  if (!m.istasyon) return { ok: false, error: "İstasyon seçin." };
  try {
    const veri = {
      ad: m.ad.trim(),
      istasyon: m.istasyon,
      sira: m.sira ?? 0,
      durum: m.durum ?? "Aktif",
    };
    const kayit = m.id
      ? await db.makine.update({ where: { id: m.id }, data: veri })
      : await db.makine.create({ data: veri });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    return { ok: true, id: kayit.id };
  } catch (e) {
    console.error("makineKaydet:", e);
    return { ok: false, error: "Makine kaydedilemedi." };
  }
}

/** Makineyi siler — parça işlem sırasında kullanılıyorsa engellenir. */
export async function makineSil(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const kullanim = await db.parcaIslem.count({ where: { makineId: id } });
    if (kullanim > 0)
      return {
        ok: false,
        error: `Makine silinemez — ${kullanim} parça işlem satırında kullanılıyor.`,
      };
    await db.makine.delete({ where: { id } });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/uretim/recete");
    return { ok: true };
  } catch (e) {
    console.error("makineSil:", e);
    return { ok: false, error: "Makine silinemedi." };
  }
}

// ── Döviz kurları (TCMB günlük bülteni) ─────────────────────────────────

/** Projede kullanılan dövizler — TCMB today.xml'den bunlar çekilir. */
const KUR_KODLARI = ["USD", "EUR", "GBP", "CHF"];

/**
 * TCMB günlük kur bültenini çekip `kur` tablosunu günceller.
 * İnternet gerekir (offline'da son kayıtlı kurlar kullanılır).
 */
export async function kurlariGuncelle(): Promise<{
  ok: boolean;
  tarih?: string;
  adet?: number;
  error?: string;
}> {
  try {
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: "TCMB'ye ulaşılamadı." };
    const xml = await res.text();
    const tarih = /Tarih_Date[^>]*Tarih="([^"]+)"/.exec(xml)?.[1] ?? "";
    const bloklar = xml.match(/<Currency[\s\S]*?<\/Currency>/g) ?? [];
    let adet = 0;
    for (const blok of bloklar) {
      const kod = /Kod="([A-Z]+)"/.exec(blok)?.[1];
      if (!kod || !KUR_KODLARI.includes(kod)) continue;
      const sayi = (tag: string) => {
        const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(blok);
        return m && m[1] ? Number(m[1]) : 0;
      };
      const ad = /<Isim>([^<]*)<\/Isim>/.exec(blok)?.[1]?.trim() ?? kod;
      const birim = Number(/<Unit>([^<]*)<\/Unit>/.exec(blok)?.[1] ?? "1") || 1;
      const veri = {
        ad,
        birim,
        forexAlis: sayi("ForexBuying"),
        forexSatis: sayi("ForexSelling"),
        banknoteAlis: sayi("BanknoteBuying"),
        banknoteSatis: sayi("BanknoteSelling"),
        tarih,
      };
      await db.kur.upsert({
        where: { kod },
        create: { kod, ...veri },
        update: veri,
      });
      adet++;
    }
    revalidatePath("/ayarlar/kurlar");
    return { ok: true, tarih, adet };
  } catch (e) {
    console.error("kurlariGuncelle:", e);
    return { ok: false, error: "Kurlar güncellenemedi (internet gerekli)." };
  }
}

// ── Düz tanımlar (marka/koleksiyon/renk/kumaş/birim) ─────────────────────

/** Tanım ekle/güncelle. */
export async function tanimKaydet(
  tip: TanimTip,
  t: {
    id?: string;
    ad: string;
    durum: "Aktif" | "Pasif";
    /** Yalnız renk: geçerli olduğu malzeme cinsleri (boş = hepsi). */
    cinsler?: string[];
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    // Renk dışındaki tiplerde cins bağlantısı yok sayılır.
    const cinsler =
      tip === "renk" && t.cinsler?.length ? t.cinsler.join(",") : null;
    if (t.id) {
      await db.tanim.update({
        where: { id: t.id },
        data: { ad: t.ad, durum: t.durum, cinsler },
      });
      revalidatePath("/stok-yonetimi");
      revalidatePath("/tanimlamalar");
      return { ok: true, id: t.id };
    }
    const yeni = await db.tanim.create({
      data: { tip, ad: t.ad, durum: t.durum, cinsler },
    });
    revalidatePath("/stok-yonetimi");
    revalidatePath("/tanimlamalar");
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
  const on = await silmeOnKontrol(ids, tanimSilinebilirMi);
  if (!on.ok) return { ok: false, error: on.error };
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
    const veri = {
      cariId: d.cariId,
      ad: d.ad,
      url: d.url,
      tip: d.tip,
      gecerlilik: d.gecerlilik ? tarihDate(d.gecerlilik) : null,
    };
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
  /** Bu satırın alındığı tedarikçi (satır bazında firma). */
  cariId: string;
  cariAd: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
};

export type YeniAlis = {
  tarih: string;
  depo: string;
  belgeNo?: string;
  aciklama?: string;
  satirlar: YeniAlisSatiri[];
  /** true → satırdaki fiyat malzemenin birim fiyatına yazılır (son alış). */
  fiyatGuncelle?: boolean;
  /** Bu alış bir talepten geliyorsa: kayıt sonrası talep satırları senkronlanır. */
  talepId?: string;
};

/**
 * Alış çekirdeği — verilen transaction içinde alış + stok girişleri + stok
 * hareketleri + tedarikçi Alacak işlemlerini yazar. alisKaydet (doğrudan alış
 * / talepten toplu dönüşüm) ve talepSiparisVer (satır bazında sipariş)
 * tarafından paylaşılır.
 */
async function alisUygula(
  tx: Prisma.TransactionClient,
  fis: {
    tarih: string;
    depo: string;
    belgeNo?: string;
    aciklama?: string;
    fiyatGuncelle?: boolean;
  },
  satirlar: YeniAlisSatiri[],
): Promise<{ alisId: string; cariIdler: string[] }> {
  // Kod üretimleri (ALS-####, CI-####). SH-#### artık sayaçtan geliyor,
  // burada taranmıyor — iki ayrı üretici numaraları çakıştırırdı.
  const [alisler, islemler] = await Promise.all([
    tx.alis.findMany({ select: { id: true } }),
    tx.cariIslem.findMany({ select: { id: true } }),
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
  let ciNo = maxNo(islemler, "CI", 3000);

  // Kart birim tanımları tutar hesabında da gerekli (bkz. lib/birim.ts
  // satirTutari): fiyat stok biriminde girilmişse düz miktar × fiyat yanlış
  // tutar verir.
  const tutarKartlari = await tx.stok.findMany({
    where: { id: { in: satirlar.map((s) => s.malzemeId) } },
    select: {
      id: true,
      stokBirimi: true,
      alisBirimi: true,
      alisCarpani: true,
      alisFiyatBirimi: true,
    },
  });
  const tutarKartMap = new Map(tutarKartlari.map((k) => [k.id, k]));
  const birimBilgisi = (malzemeId: string, yedekBirim: string): BirimBilgisi => {
    const k = tutarKartMap.get(malzemeId);
    return {
      stokBirimi: k?.stokBirimi ?? yedekBirim,
      alisBirimi: k?.alisBirimi ?? undefined,
      alisCarpani: k?.alisCarpani != null ? Number(k.alisCarpani) : undefined,
      alisFiyatBirimi: (k?.alisFiyatBirimi ?? undefined) as
        | "alis"
        | "stok"
        | undefined,
    };
  };

  const toplam = satirlar.reduce(
    (t, s) =>
      t + satirTutari(birimBilgisi(s.malzemeId, s.birim), s.miktar, s.birimFiyat),
    0,
  );
  const tarih = tarihDate(fis.tarih);

  // Tedarikçiye göre grupla (her tedarikçiye ayrı Alacak).
  const gruplar = new Map<
    string,
    { ad: string; tutar: number; adet: number }
  >();
  for (const s of satirlar) {
    const g = gruplar.get(s.cariId) ?? { ad: s.cariAd, tutar: 0, adet: 0 };
    g.tutar += satirTutari(
      birimBilgisi(s.malzemeId, s.birim),
      s.miktar,
      s.birimFiyat,
    );
    g.adet += 1;
    gruplar.set(s.cariId, g);
  }
  const tekTedarikci = gruplar.size === 1 ? [...gruplar.values()][0].ad : null;

  // 1) Alış + satırlar (tedarikçi karışıksa başlık "Muhtelif")
  await tx.alis.create({
    data: {
      id: alisId,
      cariId: gruplar.size === 1 ? [...gruplar.keys()][0] : null,
      cariAd: tekTedarikci ?? "Muhtelif",
      tarih,
      depo: fis.depo,
      belgeNo: fis.belgeNo ?? null,
      aciklama: fis.aciklama ?? null,
      toplam,
      satirlar: {
        create: satirlar.map((s) => ({
          cariId: s.cariId,
          cariAd: s.cariAd,
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
    // Alış birimi ≠ stok birimi olabilir (levha adetle alınır, m² ile
    // stoklanır) — bkz. lib/birim.ts
    const bilgi = birimBilgisi(s.malzemeId, s.birim);
    // Miktar STOK birimine çevrilir; bakiye ve reçeteler onunla çalışıyor.
    const stokArtis = stokMiktarina(bilgi, s.miktar);
    // Maliyet HER ZAMAN stok birimi başına saklanır: ₺/levha doğrudan
    // yazılsaydı reçete maliyeti (₺/m² × m²) kat kat şişerdi.
    const birimMaliyet = stokBirimFiyati(bilgi, s.birimFiyat);
    const cevrimNotu = donusumVar(bilgi)
      ? ` (${s.miktar} ${bilgi.alisBirimi} × ${bilgi.alisCarpani})`
      : "";

    await tx.stok.update({
      where: { id: s.malzemeId },
      data: {
        stokMiktar: { increment: stokArtis },
        ...(fis.fiyatGuncelle ? { maliyetFiyati: birimMaliyet } : {}),
      },
    });
    await tx.stokHareket.create({
      data: {
        id: `SH-${await sonrakiNo(tx, "SH")}`,
        tarih,
        tur: "Giriş",
        refTip: "malzeme",
        refId: s.malzemeId,
        miktar: stokArtis,
        // Hareket stok biriminde yazılır; satırın alış birimi açıklamada kalır.
        birim: bilgi.stokBirimi,
        depo: fis.depo,
        aciklama: `Satın alma ${alisId} — ${s.cariAd}${cevrimNotu}`,
      },
    });
  }

  // 3) Her tedarikçi için Alacak işlemi + bakiye
  for (const [cariId, g] of gruplar) {
    ciNo += 1;
    await tx.cariIslem.create({
      data: {
        id: `CI-${ciNo}`,
        cariId,
        tarih,
        tur: "Alacak",
        tutar: g.tutar,
        belge: fis.belgeNo ?? alisId,
        aciklama: `Satın alma ${alisId} (${g.adet} kalem)`,
      },
    });
    const c = await tx.cari.findUnique({
      where: { id: cariId },
      select: { bakiye: true },
    });
    await tx.cari.update({
      where: { id: cariId },
      data: { bakiye: Number(c?.bakiye ?? 0) + g.tutar },
    });
  }

  return { alisId, cariIdler: [...gruplar.keys()] };
}

/**
 * Alış (fatura/irsaliye) girildiğinde tedarik sürecindeki taleplerle OTOMATİK
 * eşleşme: faturadaki her (malzeme + firma) için, o firmaya SİPARİŞ verilmiş
 * açık talep satırlarını (Sipariş Verildi / Kısmi) FIFO (talep tarihine göre)
 * doldurur. Satır dolunca "Tedarik Edildi", kısmiyse "Kısmi"; talebin tüm
 * satırları bitince talep "Tamamlandı".
 */
async function talepOtoEslesme(
  tx: Prisma.TransactionClient,
  alinan: { malzemeId: string; miktar: number; cariId: string; cariAd: string }[],
  alisId: string,
) {
  // Fatura kalemlerini (malzeme, firma) bazında topla.
  const kalan = new Map<string, number>();
  for (const a of alinan) {
    const key = `${a.malzemeId}::${a.cariId}`;
    kalan.set(key, (kalan.get(key) ?? 0) + a.miktar);
  }
  if (kalan.size === 0) return;

  // Açık siparişler (Tedarik Sürecinde talepler) — FIFO: talep tarihi.
  const acikSiparisler = await tx.satinAlmaTalepSiparis.findMany({
    where: { satir: { talep: { durum: "Tedarik Sürecinde" } } },
    include: {
      satir: {
        select: {
          id: true,
          malzemeId: true,
          talepId: true,
          talep: { select: { tarih: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  acikSiparisler.sort(
    (a, b) => a.satir.talep.tarih.getTime() - b.satir.talep.tarih.getTime(),
  );

  const etkilenenSatirlar = new Set<number>();
  const etkilenenTalepler = new Set<string>();
  for (const sip of acikSiparisler) {
    const key = `${sip.satir.malzemeId}::${sip.cariId}`;
    const havuz = kalan.get(key);
    if (!havuz || havuz <= 1e-9) continue;
    const sipKalan = Number(sip.miktar) - Number(sip.tedarikEdilen);
    if (sipKalan <= 1e-9) continue;
    const uygula = Math.min(havuz, sipKalan);
    kalan.set(key, havuz - uygula);

    // Fiş izi: siparişi karşılayan alış(lar) — detayda link olarak gösterilir.
    const alisIds = (sip.alisIds ?? "").split(",").filter(Boolean);
    if (!alisIds.includes(alisId)) alisIds.push(alisId);
    await tx.satinAlmaTalepSiparis.update({
      where: { id: sip.id },
      data: {
        tedarikEdilen: Number(sip.tedarikEdilen) + uygula,
        alisIds: alisIds.join(","),
      },
    });
    etkilenenSatirlar.add(sip.satir.id);
    etkilenenTalepler.add(sip.satir.talepId);
  }

  // Etkilenen satırların tedarik toplamını ve durumunu yeniden hesapla.
  for (const satirId of etkilenenSatirlar) {
    const satir = await tx.satinAlmaTalepSatiri.findUnique({
      where: { id: satirId },
      include: { siparisler: true },
    });
    if (!satir) continue;
    const toplamGelen = satir.siparisler.reduce(
      (t, o) => t + Number(o.tedarikEdilen),
      0,
    );
    const bitti = toplamGelen >= Number(satir.miktar) - 1e-9;
    await tx.satinAlmaTalepSatiri.update({
      where: { id: satirId },
      data: {
        tedarikEdilen: toplamGelen,
        satirDurum: bitti ? "Tedarik Edildi" : "Kısmi",
      },
    });
  }

  // Etkilenen taleplerin tümü bittiyse Tamamlandı + son alış bağla.
  for (const talepId of etkilenenTalepler) {
    const satirlar = await tx.satinAlmaTalepSatiri.findMany({
      where: { talepId },
      select: { satirDurum: true },
    });
    const hepsiBitti = satirlar.every((s) => s.satirDurum === "Tedarik Edildi");
    await tx.satinAlmaTalep.update({
      where: { id: talepId },
      data: { alisId, ...(hepsiBitti ? { durum: "Tamamlandı" } : {}) },
    });
  }
}

/**
 * Satın alma kaydı — tek transaction'da:
 *  1. alis + satırları yazılır (ALS-####); tedarikçi satır bazında.
 *  2. her satır: stok artar + stok hareketi (Giriş) yazılır
 *  3. HER tedarikçi için ayrı Alacak işlemi düşer (bakiyeleri güncellenir)
 *  4. talepId verildiyse talep satırları senkronlanır (kısmi/tam tedarik).
 * Alış silme v1'de yok (stok/cari geri alma gerektirir).
 */
export async function alisKaydet(
  a: YeniAlis,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const satirlar = a.satirlar.filter((s) => s.malzemeId && s.miktar > 0);
  if (satirlar.length === 0)
    return { ok: false, error: "En az bir malzeme satırı gerekli." };
  if (satirlar.some((s) => !s.cariId))
    return { ok: false, error: "Her satır için tedarikçi seçin." };

  try {
    // Sayaç satırı transaction'dan ÖNCE: içeride kurulsaydı eşzamanlı
    // yazarlar aynı satırı oluşturmaya çalışıp çakışırdı.
    await sayacHazirla("SH", enBuyukSH);
    const { alisId, cariIdler } = await db.$transaction(async (tx) => {
      const sonuc = await alisUygula(tx, a, satirlar);
      // Tedarik sürecindeki taleplerle otomatik eşleşme (malzeme + firma).
      await talepOtoEslesme(
        tx,
        satirlar.map((s) => ({
          malzemeId: s.malzemeId,
          miktar: s.miktar,
          cariId: s.cariId,
          cariAd: s.cariAd,
        })),
        sonuc.alisId,
      );
      return sonuc;
    });

    if (a.talepId) revalidatePath("/satin-alma/talepler");
    revalidatePath("/satin-alma");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/cari");
    for (const cariId of cariIdler) revalidatePath(`/cari/${cariId}`);
    return { ok: true, id: alisId };
  } catch (e) {
    console.error("alisKaydet:", e);
    return { ok: false, error: "Alış kaydedilemedi." };
  }
}

// ── Satın alma talepleri (onay havuzu + tedarik süreci) ─────────────────
// Beklemede → (Yönetici) Onaylandı | Reddedildi →
// (Satın Alma departmanı) Tedarik Sürecinde → satır satır mal kabul → Tamamlandı.

const bugunStr = () => new Date().toISOString().slice(0, 10);

/**
 * Talep aksiyonları için rol/departman kontrolü.
 *
 * Kimlik PARAMETRE OLARAK ALINMAZ, oturumdan çözülür: istemciden gelen
 * kullanıcı id'si taklit edilebilirdi (biri başkasının id'siyle talep
 * onaylayabiliyordu).
 */
async function talepYetkiKontrol(
  gerek: "onay" | "baslat",
): Promise<{ ok: true; ad: string } | { ok: false; error: string }> {
  const o = await getOturum();
  if (!o) return { ok: false, error: "Oturum bulunamadı. Tekrar giriş yapın." };
  const k = { rol: o.rol, departman: o.departman, adSoyad: o.adSoyad };
  if (gerek === "onay") {
    if (k.rol !== "Yönetici")
      return {
        ok: false,
        error: "Talebi yalnızca Yönetici rolü onaylayabilir veya reddedebilir.",
      };
  } else {
    const satinAlmaci = (k.departman ?? "")
      .toLocaleLowerCase("tr")
      .includes("satın alma");
    if (!satinAlmaci && k.rol !== "Yönetici")
      return {
        ok: false,
        error:
          "Tedarik işlemlerini Satın Alma departmanı (veya Yönetici) yapabilir.",
      };
  }
  return { ok: true, ad: k.adSoyad };
}

export type YeniTalepKalemi = {
  malzemeId: string;
  malzemeAd: string;
  miktar: number;
  birim: string;
  /** Önerilen tedarikçi (talep hazırlığında seçilen firma). */
  cariId?: string;
  cariAd?: string;
  /** Tahmini birim fiyat (mal kabulde öneri). */
  tahminiFiyat?: number;
};

/** Satın alma talebi oluşturur (TAL-####). Mal kabule dek stoku etkilemez. */
export async function talepOlustur(
  kalemler: YeniTalepKalemi[],
  opts?: {
    kaynak?: string;
    /** Talebin hangi modeller için açıldığı (örn. "Travo Yatak Odası × 1"). */
    modeller?: string;
    aciklama?: string;
    /** Mal kabulde önerilecek varsayılan depo (örn. plandaki hedef depo). */
    depo?: string;
    /** Talebi doğuran üretimin bağlamı (sipariş üretiminde müşteri). */
    uretimMusteri?: string;
    uretimTermin?: string;
    uretimOncelik?: string;
    /** Oluşturan (audit) — TODO: oturum gelince sunucudan çözülecek. */
    kullaniciId?: string;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const net = kalemler.filter((k) => k.malzemeId && k.miktar > 0);
  if (net.length === 0)
    return { ok: false, error: "En az bir malzeme kalemi gerekli." };
  try {
    const mevcut = await db.satinAlmaTalep.findMany({ select: { id: true } });
    let maxNo = 1000;
    for (const r of mevcut) {
      const m = /^TAL-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    const id = `TAL-${maxNo + 1}`;
    // Audit izi oturumdan; istemcinin bildirdiği id'ye güvenilmez.
    const oturumK = await getOturum();
    const k = oturumK
      ? await db.kullanici.findUnique({ where: { id: oturumK.id } })
      : null;

    // Talep hazırlığındaki dağıtım SİPARİŞ DEĞİLDİR — yalnız firma önerisidir.
    // Sipariş, tedarik süreci başladıktan sonra detay sheet'inden verilir.
    // Bu yüzden aynı malzeme yalnız firma önerisi aynıysa tek satırda toplanır;
    // farklı firmalara bölündüyse firma başına ayrı satır açılır ki dağıtım
    // bilgisi (firma + miktar + fiyat) talepte korunsun.
    const grup = new Map<
      string,
      {
        malzemeId: string;
        malzemeAd: string;
        birim: string;
        miktar: number;
        tahminiFiyat?: number;
        cariId?: string;
        cariAd?: string;
      }
    >();
    for (const kk of net) {
      const anahtar = `${kk.malzemeId}|${kk.cariId ?? ""}`;
      const g = grup.get(anahtar) ?? {
        malzemeId: kk.malzemeId,
        malzemeAd: kk.malzemeAd,
        birim: kk.birim,
        miktar: 0,
        tahminiFiyat: kk.tahminiFiyat,
        cariId: kk.cariId || undefined,
        cariAd: kk.cariAd || undefined,
      };
      g.miktar += kk.miktar;
      g.tahminiFiyat = g.tahminiFiyat ?? kk.tahminiFiyat;
      grup.set(anahtar, g);
    }
    const tarih = tarihDate(bugunStr());

    await db.satinAlmaTalep.create({
      data: {
        id,
        tarih,
        kaynak: opts?.kaynak ?? "Manuel",
        modeller: opts?.modeller ?? null,
        aciklama: opts?.aciklama ?? null,
        depo: opts?.depo ?? null,
        uretimMusteri: opts?.uretimMusteri ?? null,
        uretimTermin: opts?.uretimTermin ? tarihDate(opts.uretimTermin) : null,
        uretimOncelik: opts?.uretimOncelik ?? null,
        olusturanAd: k?.adSoyad ?? null,
        satirlar: {
          create: [...grup.values()].map((g) => ({
            malzemeId: g.malzemeId,
            malzemeAd: g.malzemeAd,
            miktar: g.miktar,
            birim: g.birim,
            tahminiFiyat: g.tahminiFiyat ?? null,
            // Önerilen firma — sipariş verilirken hazır gelir, bağlayıcı değil.
            cariId: g.cariId ?? null,
            cariAd: g.cariAd ?? null,
            // Sipariş yok: talep her zaman Bekliyor doğar.
            satirDurum: "Bekliyor",
          })),
        },
      },
    });
    revalidatePath("/satin-alma/talepler");
    return { ok: true, id };
  } catch (e) {
    console.error("talepOlustur:", e);
    return { ok: false, error: "Talep oluşturulamadı." };
  }
}

/** Talebi onaylar — yalnız Yönetici; Beklemede → Onaylandı. */
export async function talepOnayla(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const yetki = await talepYetkiKontrol("onay");
  if (!yetki.ok) return { ok: false, error: yetki.error };
  try {
    const t = await db.satinAlmaTalep.findUnique({ where: { id } });
    if (!t) return { ok: false, error: "Talep bulunamadı." };
    if (t.durum !== "Beklemede")
      return { ok: false, error: `Talep zaten "${t.durum}" durumunda.` };
    await db.satinAlmaTalep.update({
      where: { id },
      data: {
        durum: "Onaylandı",
        onaylayanAd: yetki.ad,
        onayTarihi: tarihDate(bugunStr()),
      },
    });
    revalidatePath("/satin-alma/talepler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Talep onaylanamadı." };
  }
}

/** Talebi reddeder — yalnız Yönetici; Beklemede → Reddedildi (+ neden). */
export async function talepReddet(
  id: string,
  neden?: string,
): Promise<{ ok: boolean; error?: string }> {
  const yetki = await talepYetkiKontrol("onay");
  if (!yetki.ok) return { ok: false, error: yetki.error };
  try {
    const t = await db.satinAlmaTalep.findUnique({ where: { id } });
    if (!t) return { ok: false, error: "Talep bulunamadı." };
    if (t.durum !== "Beklemede")
      return { ok: false, error: `Talep zaten "${t.durum}" durumunda.` };
    await db.satinAlmaTalep.update({
      where: { id },
      data: {
        durum: "Reddedildi",
        onaylayanAd: yetki.ad, // kararı veren (audit)
        onayTarihi: tarihDate(bugunStr()),
        redNedeni: neden?.trim() || null,
      },
    });
    revalidatePath("/satin-alma/talepler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Talep reddedilemedi." };
  }
}

/** Tedarik sürecini başlatır — Satın Alma departmanı (veya Yönetici). */
export async function talepBaslat(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const yetki = await talepYetkiKontrol("baslat");
  if (!yetki.ok) return { ok: false, error: yetki.error };
  try {
    const t = await db.satinAlmaTalep.findUnique({ where: { id } });
    if (!t) return { ok: false, error: "Talep bulunamadı." };
    if (t.durum !== "Onaylandı")
      return { ok: false, error: "Yalnızca onaylanmış talep başlatılabilir." };
    await db.satinAlmaTalep.update({
      where: { id },
      data: {
        durum: "Tedarik Sürecinde",
        baslatanAd: yetki.ad,
        baslatmaTarihi: tarihDate(bugunStr()),
      },
    });
    revalidatePath("/satin-alma/talepler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Talep başlatılamadı." };
  }
}

/** Bir firmaya sipariş belgesi (SIP-####) oluşturur.
 *  Kalemler aynı talebin satırlarıdır; her kalem o satırdan sipariş düşer.
 *  Miktar satırın kalanını aşamaz — eksik verilen kısım satırda bekler
 *  (kısmi sipariş), sonra aynı ya da başka firmaya verilebilir.
 *  Stok ve cari etkilenmez; stok girişi fatura/mal kabulde olur. */
export async function siparisOlustur(girdi: {
  talepId: string;
  cariId: string;
  cariAd: string;
  kalemler: { satirId: number; miktar: number; fiyat?: number }[];
  notlar?: string;
  kullaniciId: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const yetki = await talepYetkiKontrol("baslat");
  if (!yetki.ok) return { ok: false, error: yetki.error };
  if (!girdi.cariId) return { ok: false, error: "Tedarikçi seçin." };
  const net = girdi.kalemler.filter((k) => k.miktar > 0);
  if (net.length === 0)
    return { ok: false, error: "En az bir kalem ve miktar girin." };
  try {
    const talep = await db.satinAlmaTalep.findUnique({
      where: { id: girdi.talepId },
      include: { satirlar: { include: { siparisler: true } } },
    });
    if (!talep) return { ok: false, error: "Talep bulunamadı." };
    if (talep.durum !== "Tedarik Sürecinde")
      return { ok: false, error: "Talep tedarik sürecinde değil." };

    // Her kalem: satır var mı + kalan sipariş miktarını aşmıyor mu?
    for (const k of net) {
      const satir = talep.satirlar.find((s) => s.id === k.satirId);
      if (!satir) return { ok: false, error: "Talep satırı bulunamadı." };
      const siparilen = satir.siparisler.reduce(
        (t, o) => t + Number(o.miktar),
        0,
      );
      const kalan = Number(satir.miktar) - siparilen;
      if (k.miktar > kalan + 1e-9)
        return {
          ok: false,
          error: `${satir.malzemeAd}: en fazla ${kalan.toLocaleString("tr-TR")} ${satir.birim} sipariş verilebilir.`,
        };
    }

    const mevcut = await db.satinAlmaSiparis.findMany({ select: { id: true } });
    let maxNo = 1000;
    for (const r of mevcut) {
      const m = /^SIP-(\d+)$/.exec(r.id);
      if (m) maxNo = Math.max(maxNo, Number(m[1]));
    }
    const id = `SIP-${maxNo + 1}`;
    const k = girdi.kullaniciId
      ? await db.kullanici.findUnique({ where: { id: girdi.kullaniciId } })
      : null;
    const tarih = tarihDate(bugunStr());

    await db.$transaction(async (tx) => {
      await tx.satinAlmaSiparis.create({
        data: {
          id,
          talepId: talep.id,
          cariId: girdi.cariId,
          cariAd: girdi.cariAd,
          tarih,
          depo: talep.depo,
          notlar: girdi.notlar ?? null,
          olusturanAd: k?.adSoyad ?? null,
          satirlar: {
            create: net.map((kk) => ({
              satirId: kk.satirId,
              cariId: girdi.cariId,
              cariAd: girdi.cariAd,
              miktar: kk.miktar,
              fiyat: kk.fiyat ?? null,
              tarih,
            })),
          },
        },
      });
      // Sipariş verilen satırlar Bekliyor'dan çıkar.
      await tx.satinAlmaTalepSatiri.updateMany({
        where: { id: { in: net.map((kk) => kk.satirId) }, satirDurum: "Bekliyor" },
        data: { satirDurum: "Sipariş Verildi" },
      });
    });
    revalidatePath("/satin-alma/talepler");
    revalidatePath("/satin-alma/siparisler");
    return { ok: true, id };
  } catch (e) {
    console.error("siparisOlustur:", e);
    return { ok: false, error: "Sipariş oluşturulamadı." };
  }
}

/** Siparişin tedarikçiye mail atıldığını işaretler.
 *  TODO: mail altyapısı gelince gerçek gönderim buradan tetiklenecek. */
export async function siparisMailIsaretle(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.satinAlmaSiparis.update({
      where: { id },
      data: { mailTarihi: new Date() },
    });
    revalidatePath("/satin-alma/talepler");
    return { ok: true };
  } catch (e) {
    console.error("siparisMailIsaretle:", e);
    return { ok: false, error: "İşaretlenemedi." };
  }
}


/** Talebi siler (tedarik süreci başlamış / tamamlanmış talep silinemez). */
export async function talepSil(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const t = await db.satinAlmaTalep.findUnique({
      where: { id },
      include: { satirlar: { select: { tedarikEdilen: true } } },
    });
    if (!t) return { ok: false, error: "Talep bulunamadı." };
    const tedarikVar =
      ["Tedarik Sürecinde", "Tamamlandı", "Siparişe Döndü"].includes(t.durum) ||
      t.satirlar.some((s) => Number(s.tedarikEdilen) > 0);
    if (tedarikVar)
      return { ok: false, error: "Tedarik süreci başlamış talep silinemez." };
    await db.satinAlmaTalep.delete({ where: { id } });
    revalidatePath("/satin-alma/talepler");
    return { ok: true };
  } catch {
    return { ok: false, error: "Talep silinemedi." };
  }
}

// ── Stok kartı ──────────────────────────────────────────────────────────

/** Sıradaki stok kodu (STK-####, 1000''den başlar). */
/** Yeni malzeme/stok için sıradaki kod (STK-####) + otomatik EAN-13 barkod. */
export async function sonrakiStokKodu(): Promise<{
  kod: string;
  barkod: string;
}> {
  const rows = await db.stok.findMany({ select: { id: true } });
  let max = 1000;
  for (const r of rows) {
    const m = /^STK-(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const kod = `STK-${max + 1}`;
  return { kod, barkod: kodBarkod(kod) };
}

/**
 * Bir grup koduna göre sıradaki model kodu (ör. YTK-000001, 6 hane) +
 * otomatik EAN-13 barkod. Grup kodu boşsa "URN" öneki kullanılır.
 */
async function grupSonrakiKod(
  grupKod: string,
): Promise<{ kod: string; barkod: string }> {
  const onek = grupKod || "URN";
  const rows = await db.stok.findMany({
    where: { id: { startsWith: onek + "-" } },
    select: { id: true },
  });
  let max = 0;
  for (const r of rows) {
    const rest = r.id.slice(onek.length + 1);
    if (/^\d+$/.test(rest)) max = Math.max(max, Number(rest));
  }
  const no = max + 1;
  const kod = `${onek}-${String(no).padStart(6, "0")}`;
  const barkod = ean13("869" + String(no).padStart(9, "0"));
  return { kod, barkod };
}

/** Yeni model kodu önizlemesi — seçilen grubun koduna göre (istemci çağırır). */
export async function modelKodOnizle(
  grupKod: string,
): Promise<{ kod: string; barkod: string }> {
  if (!grupKod) return { kod: "", barkod: "" };
  return grupSonrakiKod(grupKod);
}

/**
 * Stok kartını kaydeder ve AYNA tabloyu senkronlar:
 *  Hammadde / Yarı Mamül → malzeme (aynı id), Mamül → model (aynı id),
 *  Hizmet → ayna yok. Miktara DOKUNULMAZ (ledger yönetir; yeni aynada 0).
 * `yeni: true` → kod sunucuda üretilir.
 */
export async function stokKaydet(
  s: Omit<StokKarti, "miktar">,
  yeni = false,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const id = yeni ? (await sonrakiStokKodu()).kod : s.id;
    // Yeni kartta barkod koddan otomatik üretilir; düzenlemede korunur.
    const barkod = yeni ? kodBarkod(id) : (s.barkod ?? null);
    const veri = {
      kod: s.kod ?? null,
      ad: s.ad,
      cins: s.cins ?? null,
      grup: s.grup,
      altGrup: s.altGrup ?? null,
      detayGrup: s.detayGrup ?? null,
      kategori: s.kategori ?? null,
      marka: s.marka ?? null,
      model: s.model ?? null,
      stokBirimi: s.stokBirimi,
      alisBirimi: s.alisBirimi ?? null,
      alisCarpani: s.alisCarpani ?? null,
      alisFiyatBirimi: s.alisFiyatBirimi ?? null,
      puan: s.puan ?? null,
      yukseklik: s.yukseklik ?? null,
      genislik: s.genislik ?? null,
      boy: s.boy ?? null,
      kalinlik: s.kalinlik ?? null,
      agirlik: s.agirlik ?? null,
      minSiparis: s.minSiparis ?? null,
      minStok: s.minStok ?? null,
      maxStok: s.maxStok ?? null,
      muhasebeKodu: s.muhasebeKodu ?? null,
      receteParcaId: s.receteParcaId ?? null,
      rota: s.rota ?? "fabrika",
      ureticiCariId: s.ureticiCariId ?? null,
      ureticiKodu: s.ureticiKodu ?? null,
      bolum: s.bolum ?? null,
      renk: s.renk ?? null,
      renkKodu: s.renkKodu ?? null,
      barkod,
      aciklama: s.aciklama ?? null,
      durum: s.durum,
      maliyetFiyati: s.maliyetFiyati,
      maliyetBirimi: s.maliyetBirimi,
      satisFiyat1: s.satisFiyat1,
      satisBirim1: s.satisBirim1,
      satisFiyat2: s.satisFiyat2,
      satisBirim2: s.satisBirim2,
      satisFiyat3: s.satisFiyat3,
      satisBirim3: s.satisBirim3,
      satisFiyat4: s.satisFiyat4,
      satisBirim4: s.satisBirim4,
      satisFiyat5: s.satisFiyat5,
      satisBirim5: s.satisBirim5,
    };

    // Tek fiziksel tablo: stok. Miktar (stokMiktar) ledger'a ait; kayıt update'i
    // create'te 0 ile başlar, güncellemede miktara dokunmaz.
    await db.stok.upsert({
      where: { id },
      create: { id, ...veri, stokMiktar: 0 },
      update: veri,
    });

    revalidatePath("/stok-karti");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/urunler");
    return { ok: true, id };
  } catch (e) {
    console.error("stokKaydet:", e);
    return { ok: false, error: "Stok kartı kaydedilemedi." };
  }
}

/**
 * Stok kartını siler: alt kayıtlar (üretici/müşteri/doküman) cascade gider.
 * Reçetede, BOM'da veya üretimde kullanılan kalem FK ihlaliyle reddedilir.
 */
export async function stokSil(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const kontrol = await stokSilinebilirMi(id);
  if (!kontrol.silinebilir)
    return { ok: false, error: kontrol.mesaj ?? "Kart silinemez." };
  try {
    await db.stok.delete({ where: { id } });
    revalidatePath("/stok-karti");
    revalidatePath("/stok-yonetimi");
    revalidatePath("/urunler");
    return { ok: true };
  } catch (e) {
    console.error("stokSil:", e);
    return { ok: false, error: "Kart silinemedi." };
  }
}

type StokAltSonuc = { ok: boolean; id?: number; error?: string };

/** Üretici kaydı ekle/güncelle. */
export async function stokUreticiKaydet(
  u: Omit<StokUretici, "id"> & { id?: number },
): Promise<StokAltSonuc> {
  try {
    const veri = {
      stokId: u.stokId,
      cariId: u.cariId,
      cariAd: u.cariAd,
      ureticiKodu: u.ureticiKodu ?? null,
      fiyat: u.fiyat,
      doviz: u.doviz,
      minSiparis: u.minSiparis ?? null,
      tedarikGun: u.tedarikGun ?? null,
    };
    // Fiyat tarihi: kullanıcı girdiyse o geçerli (eski tarihli listeden fiyat
    // girilebilir). Girmediyse, fiyat gerçekten değiştiyse bugün damgalanır —
    // yalnız min. sipariş/kod düzeltmesi fiyatı "taze" göstermemeli.
    const elleTarih = u.fiyatTarihi ? tarihDate(u.fiyatTarihi) : null;
    const oncekiFiyat = u.id
      ? await db.stokUretici.findUnique({
          where: { id: u.id },
          select: { fiyat: true },
        })
      : null;
    const fiyatDegisti =
      !u.id || oncekiFiyat == null || Number(oncekiFiyat.fiyat) !== u.fiyat;
    const damga = elleTarih ?? (fiyatDegisti ? new Date() : null);
    const kayit = u.id
      ? await db.stokUretici.update({
          where: { id: u.id },
          data: damga ? { ...veri, fiyatTarihi: damga } : veri,
        })
      : await db.stokUretici.create({
          data: { ...veri, fiyatTarihi: damga ?? new Date() },
        });
    revalidatePath(`/stok-karti/${u.stokId}`);
    revalidatePath("/satin-alma/sartlar");
    return { ok: true, id: kayit.id };
  } catch {
    return { ok: false, error: "Üretici kaydedilemedi." };
  }
}

export async function stokUreticiSil(
  id: number,
  stokId: string,
): Promise<StokAltSonuc> {
  try {
    await db.stokUretici.delete({ where: { id } });
    revalidatePath(`/stok-karti/${stokId}`);
    revalidatePath("/satin-alma/sartlar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Üretici silinemedi." };
  }
}

/** Müşteri kaydı ekle/güncelle. */
export async function stokMusteriKaydet(
  u: Omit<StokMusteri, "id"> & { id?: number },
): Promise<StokAltSonuc> {
  try {
    const veri = {
      stokId: u.stokId,
      cariId: u.cariId,
      cariAd: u.cariAd,
      musteriKodu: u.musteriKodu ?? null,
      minSiparis: u.minSiparis ?? null,
      fiyat: u.fiyat,
      doviz: u.doviz,
      iskontoOrani: u.iskontoOrani ?? 0,
    };
    const kayit = u.id
      ? await db.stokMusteri.update({ where: { id: u.id }, data: veri })
      : await db.stokMusteri.create({ data: veri });
    revalidatePath(`/stok-karti/${u.stokId}`);
    return { ok: true, id: kayit.id };
  } catch {
    return { ok: false, error: "Müşteri kaydedilemedi." };
  }
}

export async function stokMusteriSil(
  id: number,
  stokId: string,
): Promise<StokAltSonuc> {
  try {
    await db.stokMusteri.delete({ where: { id } });
    revalidatePath(`/stok-karti/${stokId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Müşteri silinemedi." };
  }
}

/** Doküman ekle/güncelle (URL upload API''den gelir). */
export async function stokDokumanKaydet(
  d: Omit<StokDokuman, "id"> & { id?: number },
): Promise<StokAltSonuc> {
  try {
    const veri = { stokId: d.stokId, ad: d.ad, url: d.url, tip: d.tip };
    const kayit = d.id
      ? await db.stokDokuman.update({ where: { id: d.id }, data: veri })
      : await db.stokDokuman.create({ data: veri });
    revalidatePath(`/stok-karti/${d.stokId}`);
    return { ok: true, id: kayit.id };
  } catch {
    return { ok: false, error: "Doküman kaydedilemedi." };
  }
}

export async function stokDokumanSil(
  id: number,
  stokId: string,
): Promise<StokAltSonuc> {
  try {
    await db.stokDokuman.delete({ where: { id } });
    revalidatePath(`/stok-karti/${stokId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Doküman silinemedi." };
  }
}

// ── Parça dokümanları (StokDokuman UI'ıyla aynı; stokId alanı parcaId taşır) ──
export async function parcaDokumanKaydet(
  d: Omit<StokDokuman, "id"> & { id?: number },
): Promise<StokAltSonuc> {
  try {
    const veri = { parcaId: d.stokId, ad: d.ad, url: d.url, tip: d.tip };
    const kayit = d.id
      ? await db.parcaDokuman.update({ where: { id: d.id }, data: veri })
      : await db.parcaDokuman.create({ data: veri });
    revalidatePath(`/parcalar/${d.stokId}`);
    return { ok: true, id: kayit.id };
  } catch {
    return { ok: false, error: "Doküman kaydedilemedi." };
  }
}

export async function parcaDokumanSil(
  id: number,
  parcaId: string,
): Promise<StokAltSonuc> {
  try {
    await db.parcaDokuman.delete({ where: { id } });
    revalidatePath(`/parcalar/${parcaId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Doküman silinemedi." };
  }
}

