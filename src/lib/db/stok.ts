import "server-only";

import { db } from "./index";
import { sayacHazirla, sonrakiNo, type TxIstemci } from "./sayac";
import { PARAMETRELER } from "../parametreler";
import { type IstasyonSlug } from "../fabrika";

/** Rota sırasındaki istasyon slug'ları (DB); boşsa güvenli varsayılan. */
async function rotaSluglari(): Promise<string[]> {
  const rows = await db.istasyon.findMany({
    orderBy: { sira: "asc" },
    select: { id: true },
  });
  return rows.length > 0 ? rows.map((r) => r.id) : ["kesim"];
}

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
  ilkSlug: string,
) {
  if (gezilen.has(parcaId)) return; // döngü koruması
  const yeniGezilen = new Set(gezilen);
  yeniGezilen.add(parcaId);
  for (const s of satirlar.get(parcaId) ?? []) {
    const brut = s.miktar * (1 + s.fire / 100) * carpan;
    if (s.tip === "malzeme" && s.malzemeId) {
      const istasyon = (s.istasyon ?? ilkSlug) as IstasyonSlug;
      const ic = topla.get(s.malzemeId) ?? new Map<IstasyonSlug, number>();
      ic.set(istasyon, (ic.get(istasyon) ?? 0) + brut);
      topla.set(s.malzemeId, ic);
    } else if (s.tip === "parca" && s.altParcaId) {
      parcayiPatlat(s.altParcaId, brut, satirlar, topla, yeniGezilen, ilkSlug);
    }
  }
}

/**
 * Emir referansının toplam malzeme ihtiyacı (adet ile çarpılmış, istasyona
 * kırılımlı). refTip "model" → model BOM'u; "parca" → parça reçetesi direkt.
 */
export async function modelIhtiyaclari(
  modelId: string,
  adet: number,
  refTip: "model" | "parca" = "model",
): Promise<Ihtiyac[]> {
  const [bom, satirlar, rota] = await Promise.all([
    refTip === "model"
      ? db.modelParca.findMany({ where: { modelId } })
      : Promise.resolve([]),
    parcaSatirlariniYukle(),
    rotaSluglari(),
  ]);
  const ilkSlug = rota[0];
  const topla = new Map<string, Map<IstasyonSlug, number>>();
  if (refTip === "parca") {
    parcayiPatlat(modelId, adet, satirlar, topla, new Set(), ilkSlug);
  }
  for (const mp of bom) {
    parcayiPatlat(
      mp.parcaId,
      Number(mp.miktar) * adet,
      satirlar,
      topla,
      new Set(),
      ilkSlug,
    );
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

/** Mevcut en büyük SH numarası — sayaç ilk kez kurulurken kullanılır. */
async function enBuyukHareketNo(): Promise<number> {
  const rows = await db.stokHareket.findMany({ select: { id: true } });
  let maxNo = 1000;
  for (const r of rows) {
    const m = /^SH-(\d+)$/.exec(r.id);
    if (m) maxNo = Math.max(maxNo, Number(m[1]));
  }
  return maxNo;
}

/**
 * Sıradaki SH-#### numarası — sayaç tablosundan, atomik.
 *
 * Önceden "tüm id'leri tara, max+1" ile üretiliyordu; eşzamanlı iki yazar aynı
 * numarayı alıp ikincisi patlıyordu. Ölçtük: 5 paralel yazarda yeniden deneme
 * bile yetmedi. Sayaç satır kilidi aldığı için artık çakışma mümkün değil.
 */
async function sonrakiHareketNo(tx: TxIstemci): Promise<number> {
  return sonrakiNo(tx, "SH");
}

/** Hareket sayacını hazırlar — her hareket transaction'ından ÖNCE. */
async function hareketSayaciHazirla(): Promise<void> {
  await sayacHazirla("SH", enBuyukHareketNo);
}

/** Prisma benzersizlik ihlali (aynı SH-#### iki kez üretilmiş). */
function benzersizlikIhlali(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "P2002"
  );
}

/**
 * Hareket yazan transaction — benzersizlik ihlalinde baştan dener.
 *
 * Numaralar artık sayaçtan geldiği için çakışma beklenmiyor; bu yalnızca
 * emniyet kemeri (ör. dışarıdan elle eklenmiş bir SH kaydı sayacın önüne
 * geçmişse). Sayaç devreye girmeden önce 5 paralel yazarda 3 deneme yetmiyordu,
 * o yüzden tek başına yeterli sayılmamalı.
 */
async function hareketTx<T>(
  is: (tx: TxIstemci) => Promise<T>,
  deneme = 3,
): Promise<T> {
  // Sayaç satırı transaction DIŞINDA garantilenir; içeride oluşturulsaydı
  // eşzamanlı yazarlar aynı satırı kurmaya çalışıp çakışırdı.
  await hareketSayaciHazirla();
  for (let i = 0; ; i++) {
    try {
      return await db.$transaction(is);
    } catch (e) {
      if (i >= deneme - 1 || !benzersizlikIhlali(e)) throw e;
    }
  }
}

export type EksikMalzeme = {
  malzemeId: string;
  ad: string;
  birim: string;
  gereken: number;
  eldeki: number;
  /**
   * Bu malzemeden BAŞKA açık emirler için ayrılmış miktar.
   * Fiziksel stok yettiği halde eksik çıkıyorsa sebebi budur.
   */
  baskaEmirRezervi: number;
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

  // Parametreler stok bakiyesinden bağımsız; transaction dışında okunabilir.
  // Rezerv de burada: BOM patlatması pahalı, transaction içinde yapılsaydı
  // kilitler gereksiz uzun tutulurdu. Rezerv türetilmiş bir sayı, anlık
  // tazeliği kritik değil; fiziksel stok kontrolü transaction içinde kalıyor.
  const [negatifIzin, depo, rezerv] = await Promise.all([
    parametreDegeri("negatif_stok").then(acikMi),
    parametreDegeri("varsayilan_depo"),
    rezervDetayi(),
  ]);

  const bugun = new Date(new Date().toISOString().slice(0, 10));
  let sonuc: DusumSonuc = { ok: true, eksikler: [] };

  await hareketTx(async (tx) => {
    // Yeterlilik kontrolü transaction İÇİNDE: dışarıda yapılsaydı araya giren
    // başka bir düşüm, negatif stok kapalıyken bile bakiyeyi eksiye indirirdi.
    const malzemeler = await tx.stok.findMany({
      where: { id: { in: net.map((k) => k.malzemeId) } },
    });
    const malzemeMap = new Map(malzemeler.map((m) => [m.id, m]));

    const eksikler: EksikMalzeme[] = [];
    for (const k of net) {
      const m = malzemeMap.get(k.malzemeId);
      if (!m) continue;
      // Bu emrin KENDİ rezervi düşülür; yoksa emir kendi ihtiyacı yüzünden
      // kendini engellerdi.
      const ic = rezerv.detay.get(k.malzemeId);
      let baskaEmirRezervi = 0;
      if (ic) {
        // Sırası olmayan emir (ör. kapanmış) en sona atılır; yalnızca
        // KENDİNDEN ÖNCEKİ emirler engeller — bkz. RezervDetay.sira.
        const benimSira = rezerv.sira.get(emir.id) ?? Number.MAX_SAFE_INTEGER;
        for (const [eId, miktar] of ic) {
          if (eId === emir.id) continue;
          const oSira = rezerv.sira.get(eId) ?? Number.MAX_SAFE_INTEGER;
          if (oSira < benimSira) baskaEmirRezervi += miktar;
        }
      }
      const eldeki = Number(m.stokMiktar);
      // Kullanılabilir = fiziksel stok − başka emirlere ayrılmış miktar.
      // Önceden yalnız fiziksel stoka bakılıyordu; rezerv salt gösterimlikti
      // ve bir emir başka emrin malzemesini sessizce tüketebiliyordu.
      if (eldeki - baskaEmirRezervi < k.miktar) {
        eksikler.push({
          malzemeId: k.malzemeId,
          ad: m.ad,
          birim: m.stokBirimi,
          gereken: k.miktar,
          eldeki,
          baskaEmirRezervi,
        });
      }
    }
    if (eksikler.length > 0 && !negatifIzin) {
      // Hiçbir şey yazılmadı; transaction boş kapanır.
      const rezervdenMi = eksikler.some(
        (e) => e.eldeki >= e.gereken && e.baskaEmirRezervi > 0,
      );
      sonuc = {
        ok: false,
        eksikler,
        error: rezervdenMi
          ? "Stok yetersiz — bir kısmı başka üretim emirleri için rezerve."
          : "Stok yetersiz — Negatif Stok parametresi kapalı.",
      };
      return;
    }

    for (const k of net) {
      const m = malzemeMap.get(k.malzemeId);
      if (!m) continue;
      await tx.stokHareket.create({
        data: {
          // Numara satır satır alınır: tek numara alıp yerel artırmak, aradaki
          // numaraları başka bir yazarın almasıyla çakışırdı.
          id: `SH-${await sonrakiHareketNo(tx)}`,
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
    sonuc = { ok: true, eksikler };
  });

  return sonuc;
}

// ── Mod 1: üretime geçişte toplu düşüm ──────────────────────────────────
export async function uretimeGecisDusumu(emir: {
  id: string;
  refTip?: "model" | "parca";
  modelId: string;
  modelAd: string;
  adet: number;
}): Promise<DusumSonuc> {
  const hemenDus = acikMi(await parametreDegeri("uretimde_hemen_dus"));
  if (!hemenDus) return { ok: true, eksikler: [] }; // Mod 2: rezerv yeter

  const [ihtiyaclar, dusulen] = await Promise.all([
    modelIhtiyaclari(emir.modelId, emir.adet, emir.refTip ?? "model"),
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
  emir: {
    id: string;
    refTip?: "model" | "parca";
    modelId: string;
    modelAd: string;
    adet: number;
  },
  istasyon: IstasyonSlug,
): Promise<DusumSonuc> {
  const hemenDus = acikMi(await parametreDegeri("uretimde_hemen_dus"));
  if (hemenDus) return { ok: true, eksikler: [] }; // Mod 1'de zaten düşüldü

  const [ihtiyaclar, dusulenRows] = await Promise.all([
    modelIhtiyaclari(emir.modelId, emir.adet, emir.refTip ?? "model"),
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
  refTip?: "model" | "parca";
  modelId: string;
  modelAd: string;
  adet: number;
}): Promise<void> {
  // Parça emri: stok kartı yok — mamul girişi yazılmaz (iç üretim).
  if (emir.refTip === "parca") return;
  // Aynı emir için ikinci kez giriş yazma.
  const mevcut = await db.stokHareket.findFirst({
    where: { emirId: emir.id, tur: "Giriş", refTip: "model" },
  });
  if (mevcut) return;

  const depo = await parametreDegeri("varsayilan_depo");
  const bugun = new Date(new Date().toISOString().slice(0, 10));

  await hareketTx(async (tx) => {
    await tx.stokHareket.create({
      data: {
        id: `SH-${await sonrakiHareketNo(tx)}`,
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

// ── Elle stok düzeltme (sayım farkı) ────────────────────────────────────
export type StokDuzeltSonuc = {
  ok: boolean;
  error?: string;
  /** Düzeltme sonrası eldeki miktar (ok:true ise dolu). */
  yeniMiktar?: number;
};

/**
 * Eldeki miktarı sayılan değere çeker. Miktarı DOĞRUDAN yazmaz: farkı bir
 * Giriş/Çıkış hareketine çevirir — defter tek kaynak olduğu için düzeltme de
 * diğer her hareket gibi izlenebilir kalmalı (kim, ne zaman, neden).
 *
 * `aciklama` zorunlu: gerekçesiz düzeltme denetlenemez, sayım farkının anlamı
 * (fire/kayıp/hatalı giriş) yalnız burada yaşar.
 *
 * Fark transaction İÇİNDE taze okunur ve `increment` ile uygulanır — `set`
 * kullansaydık, sayımla yazım arasına giren gerçek bir hareket (üretim düşümü)
 * sessizce ezilirdi. increment ile sonuç `sayılan + araya giren` olur; bu
 * doğrudur, çünkü o hareket gerçekten oldu.
 */
export async function stokDuzeltmeYaz(
  stokId: string,
  sayilanMiktar: number,
  aciklama: string,
): Promise<StokDuzeltSonuc> {
  const gerekce = aciklama.trim();
  if (!gerekce) return { ok: false, error: "Düzeltme gerekçesi zorunlu." };
  if (!Number.isFinite(sayilanMiktar)) {
    return { ok: false, error: "Sayılan miktar geçersiz." };
  }

  const [kart, negatifIzin, depo] = await Promise.all([
    db.stok.findUnique({ where: { id: stokId } }),
    parametreDegeri("negatif_stok").then(acikMi),
    parametreDegeri("varsayilan_depo"),
  ]);
  if (!kart) return { ok: false, error: "Stok kartı bulunamadı." };
  if (sayilanMiktar < 0 && !negatifIzin) {
    return { ok: false, error: "Negatif stok — Negatif Stok parametresi kapalı." };
  }

  const bugun = new Date(new Date().toISOString().slice(0, 10));
  // Mamul de malzeme de aynı stok tablosunda; hareketin ref'i ayrımı taşır.
  const refTip = kart.grup === "Mamül" ? "model" : "malzeme";

  let sonuc: StokDuzeltSonuc = { ok: true, yeniMiktar: Number(kart.stokMiktar) };
  await hareketTx(async (tx) => {
    const taze = await tx.stok.findUniqueOrThrow({
      where: { id: stokId },
      select: { stokMiktar: true },
    });
    const onceki = Number(taze.stokMiktar);
    const fark = sayilanMiktar - onceki;
    // dusumYaz ile aynı eşik: 0.0005 altı fark Decimal(14,3) gürültüsüdür.
    if (Math.abs(fark) < 0.0005) {
      sonuc = { ok: true, yeniMiktar: onceki };
      return;
    }
    await tx.stokHareket.create({
      data: {
        id: `SH-${await sonrakiHareketNo(tx)}`,
        tarih: bugun,
        tur: fark > 0 ? "Giriş" : "Çıkış",
        refTip,
        refId: stokId,
        miktar: Math.abs(fark),
        birim: kart.stokBirimi,
        depo,
        aciklama: `Stok düzeltme (${onceki} → ${sayilanMiktar}) — ${gerekce}`,
      },
    });
    await tx.stok.update({
      where: { id: stokId },
      data: { stokMiktar: { increment: fark } },
    });
    sonuc = { ok: true, yeniMiktar: onceki + fark };
  });
  return sonuc;
}


// ── Emir iptalinde stok iadesi ──────────────────────────────────────────

/** İade hareketlerinin açıklama öneki — çifte iadeyi tespit etmek için. */
const IADE_ONEKI = "İptal iadesi";

/**
 * Bir emrin stok hareketlerini TERS KAYITLA geri alır.
 *
 * Hareketler silinmez, karşı hareket yazılır: defter mantığı bu (geçmiş
 * silinmez, düzeltilir) ve iz kalır. Malzeme çıkışları giriş olarak,
 * mamul girişi çıkış olarak yazılır.
 *
 * Önceden iptalde hiçbir iade yapılmıyordu: düşülen malzeme geri gelmiyor,
 * rezerv de iptal emrini dışladığı için malzeme kalıcı olarak kayboluyordu.
 *
 * Çifte çalıştırmaya karşı korumalı — daha önce iade yazılmışsa hiçbir şey
 * yapmaz (emir iptali zaten tek yönlü ama iade tek başına da çağrılabilir).
 */
export async function emirHareketleriniIadeEt(
  emirId: string,
): Promise<{ iadeEdilen: number }> {
  const hareketler = await db.stokHareket.findMany({ where: { emirId } });
  if (hareketler.length === 0) return { iadeEdilen: 0 };
  if (hareketler.some((h) => h.aciklama.startsWith(IADE_ONEKI))) {
    return { iadeEdilen: 0 };
  }

  const bugun = new Date(new Date().toISOString().slice(0, 10));
  let sayi = 0;

  await hareketTx(async (tx) => {
    for (const h of hareketler) {
      const tersTur = h.tur === "Çıkış" ? "Giriş" : "Çıkış";
      const yon = tersTur === "Giriş" ? 1 : -1;
      await tx.stokHareket.create({
        data: {
          id: `SH-${await sonrakiHareketNo(tx)}`,
          tarih: bugun,
          tur: tersTur,
          refTip: h.refTip,
          refId: h.refId,
          miktar: h.miktar,
          birim: h.birim,
          depo: h.depo,
          aciklama: `${IADE_ONEKI} — ${emirId} (${h.id})`,
          emirId,
          istasyon: h.istasyon,
        },
      });
      await tx.stok.update({
        where: { id: h.refId },
        data: { stokMiktar: { increment: yon * Number(h.miktar) } },
      });
      sayi += 1;
    }
  });

  return { iadeEdilen: sayi };
}

// ── Rezerv / kullanılabilir stok ────────────────────────────────────────
export type StokOzeti = {
  malzemeId: string;
  eldeki: number;
  rezerve: number;
  kullanilabilir: number;
};

export type RezervDetay = {
  /** malzemeId → (emirId → kalan rezerv) */
  detay: Map<string, Map<string, number>>;
  /**
   * emirId → sıra. Küçük olan önce gelir (oluşturma tarihi, eşitlikte id).
   *
   * Sıra ŞART: rezerv koşulsuz uygulansaydı kilitlenme olurdu — 10 stok
   * varken 8'er ihtiyaçlı iki emirde her biri diğerinin rezervi yüzünden
   * engellenir, hiçbiri ilerleyemezdi. Bir emir yalnız KENDİNDEN ÖNCEKİ
   * emirlerin rezervi tarafından engellenir; böylece en eski emir daima
   * ilerleyebilir ve sıra doğal olarak çözülür.
   */
  sira: Map<string, number>;
};

/**
 * Açık emirlerin henüz düşülmemiş ihtiyacı — EMİR KIRILIMLI.
 *
 * Kırılım gerekli çünkü bir emri düşerken "başkalarının rezervi"
 * hesaplanmalı; toplam rezerv kullanılsaydı emir kendi rezervi yüzünden
 * kendini engellerdi.
 */
export async function rezervDetayi(): Promise<RezervDetay> {
  const [emirler, hareketler] = await Promise.all([
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

  const satirlar = await parcaSatirlariniYukle();
  const rota = await rotaSluglari();
  const ilkSlug = rota[0];
  const bomlar = await db.modelParca.findMany();
  const bomByModel = new Map<string, typeof bomlar>();
  for (const b of bomlar) {
    const arr = bomByModel.get(b.modelId) ?? [];
    arr.push(b);
    bomByModel.set(b.modelId, arr);
  }

  // Sıra: önce oluşturma tarihi, eşitlikte id — deterministik olmalı, yoksa
  // aynı anda iki emir birbirini "önceki" sayıp yine kilitlenebilirdi.
  const sirali = [...emirler].sort((a, b) => {
    const f = a.olusturma.getTime() - b.olusturma.getTime();
    return f !== 0 ? f : a.id.localeCompare(b.id);
  });
  const sira = new Map<string, number>();
  sirali.forEach((e, i) => sira.set(e.id, i));

  const detay = new Map<string, Map<string, number>>();
  for (const e of emirler) {
    const topla = new Map<string, Map<IstasyonSlug, number>>();
    if (e.refTip === "parca") {
      parcayiPatlat(e.modelId, e.adet, satirlar, topla, new Set(), ilkSlug);
    }
    for (const mp of bomByModel.get(e.modelId) ?? []) {
      parcayiPatlat(
        mp.parcaId,
        Number(mp.miktar) * e.adet,
        satirlar,
        topla,
        new Set(),
        ilkSlug,
      );
    }
    for (const [malzemeId, ic] of topla) {
      let toplam = 0;
      for (const [, m] of ic) toplam += m;
      const kalan = toplam - (dusulen.get(`${e.id}:${malzemeId}`) ?? 0);
      if (kalan > 0.0005) {
        const ic2 = detay.get(malzemeId) ?? new Map<string, number>();
        ic2.set(e.id, (ic2.get(e.id) ?? 0) + kalan);
        detay.set(malzemeId, ic2);
      }
    }
  }
  return { detay, sira };
}

/** Açık emirlerin (Planlandı + Üretimde) henüz düşülmemiş ihtiyacı. */
export async function stokOzetleri(): Promise<Map<string, StokOzeti>> {
  const [malzemeler, detay] = await Promise.all([
    db.stok.findMany({ where: { grup: { in: ["Hammadde", "Yarı Mamül"] } } }),
    rezervDetayi(),
  ]);
  const rezerve = new Map<string, number>();
  for (const [malzemeId, ic] of detay.detay) {
    let t = 0;
    for (const [, m] of ic) t += m;
    rezerve.set(malzemeId, t);
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
