import "server-only";

import { db, tarihStr } from "./index";
import { kodBarkod } from "../barkod";
import { ISTASYONLAR, type Istasyon } from "../fabrika";
import type {
  Model,
  ModelVaryant,
  Parca,
  Malzeme,
  Doviz,
  Kur,
  Depo,
  Musteri,
  Siparis,
  SiparisDurum,
  Kategori,
  ParcaKategori,
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
  CariBanka,
  CariSube,
  CariYetkili,
  CariCrm,
  CariDokuman,
  StokHareket,
  StokHareketTuru,
  StokGrup,
  TanimTip,
  TanimKalemi,
  Alis,
  StokKarti,
  StokUretici,
  StokMusteri,
  StokDokuman,
} from "../data";

type Durum = "Aktif" | "Pasif";

/**
 * Server-only veri erişim katmanı. DB satırlarını (Decimal → number,
 * DATE → "YYYY-AA-GG" string, JSON string → dizi/nesne) uygulamadaki domain
 * tiplerine (data.ts) map'ler; böylece mevcut bileşenler ve bom.ts değişmeden
 * çalışır.
 */

function parseJson<T>(s: string | null): T | undefined {
  if (!s) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

export async function getModeller(): Promise<Model[]> {
  // Mamul kartları artık stok tablosunda (grup = "Mamül"); model tablosu kalktı.
  const [urunRows, upRows, dokRows] = await Promise.all([
    db.stok.findMany({ where: { grup: "Mamül" }, orderBy: { id: "asc" } }),
    db.modelParca.findMany(),
    // Ana görsel artık dokümanlardan gelir (malzeme kartıyla aynı sistem).
    db.stokDokuman.findMany({ select: { stokId: true, url: true, tip: true } }),
  ]);
  const docsByModel = new Map<string, { url: string; tip: string }[]>();
  for (const d of dokRows) {
    const arr = docsByModel.get(d.stokId) ?? [];
    arr.push({ url: d.url, tip: d.tip });
    docsByModel.set(d.stokId, arr);
  }
  const gorsellerByModel = new Map<string, string[]>();
  for (const [id, docs] of docsByModel) {
    gorsellerByModel.set(id, tumGorseller(docs));
  }
  const bomByUrun = new Map<string, { parcaId: string; miktar: number }[]>();
  for (const r of upRows) {
    const arr = bomByUrun.get(r.modelId) ?? [];
    arr.push({ parcaId: r.parcaId, miktar: Number(r.miktar) });
    bomByUrun.set(r.modelId, arr);
  }
  return urunRows.map((u) => ({
    id: u.id,
    ad: u.ad,
    kategori: (u.kategori ?? u.altGrup ?? u.grup) as Kategori,
    fiyat: Number(u.satisFiyat1),
    stok: Math.round(Number(u.stokMiktar)),
    durum: u.durum as Durum,
    gorsel: gorsellerByModel.get(u.id)?.[0] ?? u.gorsel ?? undefined,
    parcalar: bomByUrun.get(u.id),
    marka: u.marka ?? undefined,
    barkod: u.barkod ?? kodBarkod(u.id),
    agirlik: u.agirlik != null ? Number(u.agirlik) : undefined,
    minStok: u.minStok != null ? Math.round(Number(u.minStok)) : undefined,
    gorseller:
      gorsellerByModel.get(u.id) ?? parseJson<string[]>(u.gorsellerJson),
    varyantlar: parseJson<ModelVaryant[]>(u.varyantlarJson),
    etiketler: u.etiketler ? u.etiketler.split(",").filter(Boolean) : undefined,
    favori: u.favori || undefined,
  }));
}

export async function getParcalar(): Promise<Parca[]> {
  const [parcaRows, receteRows, docs] = await Promise.all([
    db.parca.findMany({ include: { islemler: { orderBy: { sira: "asc" } } } }),
    db.receteSatiri.findMany(),
    db.parcaDokuman.findMany({
      select: { parcaId: true, url: true, tip: true },
    }),
  ]);
  const docsByParca = new Map<string, { url: string; tip: string }[]>();
  for (const d of docs) {
    const arr = docsByParca.get(d.parcaId) ?? [];
    arr.push({ url: d.url, tip: d.tip });
    docsByParca.set(d.parcaId, arr);
  }
  const receteByParca = new Map<string, ReceteSatiri[]>();
  for (const r of receteRows) {
    const satir: ReceteSatiri = {
      bilesen:
        r.tip === "malzeme"
          ? { tip: "malzeme", ref: r.malzemeId! }
          : { tip: "parca", ref: r.altParcaId! },
      miktar: Number(r.miktar),
      fire: Number(r.fire) || undefined,
      istasyon: r.istasyon ?? undefined,
    };
    const arr = receteByParca.get(r.parcaId) ?? [];
    arr.push(satir);
    receteByParca.set(r.parcaId, arr);
  }
  const sayi = (v: unknown) => (v == null ? undefined : Number(v));
  return parcaRows.map((p) => ({
    id: p.id,
    ad: p.ad,
    kategori: p.kategori as ParcaKategori,
    aciklama: p.aciklama ?? undefined,
    durum: p.durum as Durum,
    recete: receteByParca.get(p.id) ?? [],
    gorsel: tumGorseller(docsByParca.get(p.id) ?? [])[0],
    gorseller: tumGorseller(docsByParca.get(p.id) ?? []),
    olculer: {
      kabaUzunluk: sayi(p.kabaUzunluk),
      kabaGenislik: sayi(p.kabaGenislik),
      netUzunluk: sayi(p.netUzunluk),
      netGenislik: sayi(p.netGenislik),
      bitmisUzunluk: sayi(p.bitmisUzunluk),
      bitmisGenislik: sayi(p.bitmisGenislik),
      kalinlik: sayi(p.kalinlik),
    },
    islemler: p.islemler.map((i) => ({
      id: i.id,
      sira: i.sira,
      istasyon: i.istasyon,
      makineId: i.makineId ?? undefined,
      operasyon: i.operasyon,
      aciklama: i.aciklama ?? undefined,
    })),
  }));
}

export async function getParcaDokumanlar(
  parcaId: string,
): Promise<StokDokuman[]> {
  const rows = await db.parcaDokuman.findMany({
    where: { parcaId },
    orderBy: { id: "asc" },
  });
  // StokDokuman UI'ıyla aynı şekil; stokId alanı parcaId taşır.
  return rows.map((d) => ({
    id: d.id,
    stokId: d.parcaId,
    ad: d.ad,
    url: d.url,
    tip: d.tip as StokDokuman["tip"],
  }));
}

export async function getMalzemeler(): Promise<Malzeme[]> {
  // Malzeme kartları artık stok tablosunda (grup ∈ Hammadde/Yarı Mamül).
  const [rows, dokRows] = await Promise.all([
    db.stok.findMany({
      where: { grup: { in: ["Hammadde", "Yarı Mamül"] } },
      orderBy: { id: "asc" },
    }),
    db.stokDokuman.findMany({ select: { stokId: true, url: true, tip: true } }),
  ]);
  const docsByStok = new Map<string, { url: string; tip: string }[]>();
  for (const d of dokRows) {
    const arr = docsByStok.get(d.stokId) ?? [];
    arr.push({ url: d.url, tip: d.tip });
    docsByStok.set(d.stokId, arr);
  }
  return rows.map((m) => ({
    gorsel: tumGorseller(docsByStok.get(m.id) ?? [])[0],
    gorseller: tumGorseller(docsByStok.get(m.id) ?? []),
    id: m.id,
    ad: m.ad,
    grup: m.altGrup ?? m.grup ?? undefined,
    birim: m.stokBirimi,
    stok: Number(m.stokMiktar),
    birimFiyat: Number(m.maliyetFiyati),
    doviz: (m.maliyetBirimi || "TL") as Doviz,
    tedarikci: m.ureticiCariId ?? undefined,
    bolum: m.bolum ?? undefined,
    durum: m.durum as Durum,
  }));
}

export async function getDepolar(): Promise<Depo[]> {
  const rows = await db.depo.findMany();
  return rows.map((d) => ({
    id: d.id,
    ad: d.ad,
    sehir: d.sehir,
    kapasite: d.kapasite,
    doluluk: d.doluluk,
    durum: d.durum as Durum,
  }));
}

type PosetRow = Awaited<ReturnType<typeof db.poset.findMany>>[number] & {
  malzemeler: { malzemeId: string; miktar: unknown }[];
};

function mapPoset(p: PosetRow): import("../data").Poset {
  return {
    id: p.id,
    ad: p.ad,
    aciklama: p.aciklama ?? undefined,
    durum: p.durum as Durum,
    malzemeler: p.malzemeler.map((m) => ({
      malzemeId: m.malzemeId,
      miktar: Number(m.miktar),
    })),
  };
}

export async function getPosetler(): Promise<import("../data").Poset[]> {
  const rows = await db.poset.findMany({ include: { malzemeler: true } });
  return rows.map(mapPoset);
}

export async function getPoset(
  id: string,
): Promise<import("../data").Poset | null> {
  const p = await db.poset.findUnique({
    where: { id },
    include: { malzemeler: true },
  });
  return p ? mapPoset(p) : null;
}

/** DB'de override edilmiş sistem parametre değerleri: anahtar → değer.
 *  Tanımlar kodda sabittir (src/lib/parametreler.ts); kayıt yoksa varsayılan geçerli. */
export async function getParametreDegerleri(): Promise<
  Record<string, string>
> {
  const rows = await db.sistemParametre.findMany();
  return Object.fromEntries(rows.map((r) => [r.anahtar, r.deger]));
}

/** Liste kolon ayarı: seçili ek kolonlar + gören kullanıcılar + gizlenen temel kolonlar. */
export type ListeKolonAyari = {
  kolonlar: string[];
  kullanicilar: string[];
  gizliTemel: string[];
};

export async function getListeKolonAyari(
  listeId: string,
): Promise<ListeKolonAyari> {
  const bos: ListeKolonAyari = { kolonlar: [], kullanicilar: [], gizliTemel: [] };
  const row = await db.listeAyar.findUnique({ where: { listeId } });
  if (!row) return bos;
  try {
    const k = JSON.parse(row.kolonlarJson);
    if (!k || Array.isArray(k) || typeof k !== "object") return bos;
    const str = (v: unknown) =>
      Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    return {
      kolonlar: str(k.kolonlar),
      kullanicilar: str(k.kullanicilar),
      gizliTemel: str(k.gizliTemel),
    };
  } catch {
    return bos;
  }
}

type CariRow = Awaited<ReturnType<typeof db.cari.findMany>>[number];

function mapCari(c: CariRow): Cari {
  return {
    id: c.id,
    ad: c.ad,
    tamAd: c.tamAd ?? undefined,
    tip: c.tip as CariTip,
    sinif: c.sinif as CariSinifi,
    yetkili: c.yetkili ?? undefined,
    yetkiliUnvan: c.yetkiliUnvan ?? undefined,
    yetkiliTelefon: c.yetkiliTelefon ?? undefined,
    yetkiliEmail: c.yetkiliEmail ?? undefined,
    telefon: c.telefon ?? undefined,
    telefon2: c.telefon2 ?? undefined,
    telefon3: c.telefon3 ?? undefined,
    fax: c.fax ?? undefined,
    email: c.email ?? undefined,
    webSite: c.webSite ?? undefined,
    satisFiyatTipi: c.satisFiyatTipi as Cari["satisFiyatTipi"],
    iskontoOrani: Number(c.iskontoOrani) || undefined,
    temsilci: c.temsilci ?? undefined,
    sube: c.sube ?? undefined,
    muhasebeKodu: c.muhasebeKodu ?? undefined,
    tcKimlik: c.tcKimlik ?? undefined,
    vergiNo: c.vergiNo ?? undefined,
    vergiDairesi: c.vergiDairesi ?? undefined,
    unvan: c.unvan ?? undefined,
    ulke: c.ulke ?? undefined,
    bolge: c.bolge ?? undefined,
    sehir: c.sehir ?? undefined,
    semt: c.semt ?? undefined,
    adres: c.adres ?? undefined,
    bakiye: Number(c.bakiye),
    paraBirimi: c.paraBirimi as ParaBirimi,
    durum: c.durum as Durum,
    not: c.not ?? undefined,
  };
}

export async function getCariler(): Promise<Cari[]> {
  const rows = await db.cari.findMany();
  return rows.map(mapCari);
}

export async function getCari(id: string): Promise<Cari | null> {
  const row = await db.cari.findUnique({ where: { id } });
  return row ? mapCari(row) : null;
}

export async function getCariIslemleri(cariId: string): Promise<CariIslem[]> {
  const rows = await db.cariIslem.findMany({ where: { cariId } });
  return rows
    .map((i) => ({
      id: i.id,
      cariId: i.cariId,
      tarih: tarihStr(i.tarih),
      tur: i.tur as CariIslemTuru,
      tutar: Number(i.tutar),
      belge: i.belge ?? undefined,
      aciklama: i.aciklama,
    }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

export async function getStokHareketleri(): Promise<StokHareket[]> {
  const rows = await db.stokHareket.findMany();
  return rows
    .map((h) => ({
      id: h.id,
      tarih: tarihStr(h.tarih),
      tur: h.tur as StokHareketTuru,
      ref:
        h.refTip === "model"
          ? ({ tip: "model", id: h.refId } as const)
          : ({ tip: "malzeme", id: h.refId } as const),
      miktar: Number(h.miktar),
      birim: h.birim,
      depo: h.depo,
      aciklama: h.aciklama,
    }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

/** Reçete versiyon geçmişi görünümü. */
export type ReceteVersiyonGorunum = {
  versiyonNo: number;
  tarih: string; // ISO datetime
  aciklama?: string;
  satirlar: {
    tip: "malzeme" | "parca";
    ref: string;
    miktar: number;
    fire?: number;
    istasyon?: string;
  }[];
};

/** Tüm reçetelerin versiyon geçmişi: parcaId → versiyonlar (yeni → eski). */
export async function getReceteVersiyonlari(): Promise<
  Record<string, ReceteVersiyonGorunum[]>
> {
  const rows = await db.receteVersiyon.findMany({
    orderBy: [{ parcaId: "asc" }, { versiyonNo: "desc" }],
  });
  const sonuc: Record<string, ReceteVersiyonGorunum[]> = {};
  for (const r of rows) {
    (sonuc[r.parcaId] ??= []).push({
      versiyonNo: r.versiyonNo,
      tarih: r.tarih.toISOString(),
      aciklama: r.aciklama ?? undefined,
      satirlar: JSON.parse(r.satirlarJson),
    });
  }
  return sonuc;
}

/** Fabrika sahnesi: İptal dışındaki emirler + istasyon adımları. */
/** [{ <alan>, url, tip }] listesini id → doküman listesi olarak gruplar. */
function gruplaDokuman<T extends { url: string; tip: string }>(
  rows: T[],
  alan: keyof T,
): Map<string, { url: string; tip: string }[]> {
  const m = new Map<string, { url: string; tip: string }[]>();
  for (const r of rows) {
    const id = String(r[alan]);
    const arr = m.get(id) ?? [];
    arr.push({ url: r.url, tip: r.tip });
    m.set(id, arr);
  }
  return m;
}

export async function getFabrikaEmirleri(): Promise<
  import("../fabrika").FabrikaEmri[]
> {
  const rows = await db.uretimEmri.findMany({
    where: { durum: { notIn: ["İptal"] } },
    include: { adimlar: { orderBy: { sira: "asc" } } },
    orderBy: { id: "asc" },
  });

  // Görsel + alt parça bilgisi: sol paneldeki ürün kartı için.
  const modelIds = rows.filter((e) => e.refTip === "model").map((e) => e.modelId);
  const parcaIds = rows.filter((e) => e.refTip === "parca").map((e) => e.modelId);
  const [modelParcalar, stokDokumanlar, parcaKayitlari, parcaDokumanlari] =
    await Promise.all([
      modelIds.length
        ? db.modelParca.findMany({
            where: { modelId: { in: modelIds } },
            include: { parca: { select: { id: true, ad: true } } },
          })
        : [],
      db.stokDokuman.findMany({ select: { stokId: true, url: true, tip: true } }),
      parcaIds.length
        ? db.parca.findMany({
            where: { id: { in: parcaIds } },
            select: { id: true },
          })
        : [],
      db.parcaDokuman.findMany({
        select: { parcaId: true, url: true, tip: true },
      }),
    ]);

  const stokGorsel = new Map<string, string>();
  for (const [id, docs] of gruplaDokuman(stokDokumanlar, "stokId"))
    stokGorsel.set(id, tumGorseller(docs)[0] ?? "");
  const parcaGorsel = new Map<string, string>();
  for (const [id, docs] of gruplaDokuman(parcaDokumanlari, "parcaId"))
    parcaGorsel.set(id, tumGorseller(docs)[0] ?? "");

  const parcalarByModel = new Map<
    string,
    import("../fabrika").EmirParcasi[]
  >();
  for (const mp of modelParcalar) {
    const arr = parcalarByModel.get(mp.modelId) ?? [];
    arr.push({
      parcaId: mp.parcaId,
      ad: mp.parca.ad,
      miktar: Number(mp.miktar),
      gorsel: parcaGorsel.get(mp.parcaId) || undefined,
    });
    parcalarByModel.set(mp.modelId, arr);
  }
  const parcaVar = new Set(parcaKayitlari.map((p) => p.id));

  return rows.map((e) => ({
    id: e.id,
    refTip: (e.refTip === "parca" ? "parca" : "model") as "model" | "parca",
    modelId: e.modelId,
    modelAd: e.modelAd,
    adet: e.adet,
    oncelik: e.oncelik ?? undefined,
    durum: e.durum,
    gorsel:
      (e.refTip === "parca"
        ? parcaVar.has(e.modelId)
          ? parcaGorsel.get(e.modelId)
          : undefined
        : stokGorsel.get(e.modelId)) || undefined,
    parcalar:
      e.refTip === "model" ? parcalarByModel.get(e.modelId) : undefined,
    adimlar: e.adimlar.map((a) => ({
      istasyon: a.istasyon as import("../fabrika").IstasyonSlug,
      sira: a.sira,
      durum: a.durum as import("../fabrika").AdimDurum,
      baslangic: a.baslangic?.toISOString(),
      bitis: a.bitis?.toISOString(),
      not: a.not ?? undefined,
    })),
  }));
}

/**
 * Bir üretim emrinin refakat kağıtları — parça başına bir kağıt.
 * Model emrinde modelin her parçası için, parça emrinde tek kağıt üretilir.
 * Malzeme/PVC ayrımı reçeteden: kenar bandı adı "PVC"/"BANT" içerenler
 * PVC bloğuna, en çok tüketilen diğer malzeme ana plaka sayılır.
 */
export async function getRefakatKagitlari(
  emirId: string,
): Promise<import("../data").RefakatKagidi[]> {
  const emir = await db.uretimEmri.findUnique({ where: { id: emirId } });
  if (!emir) return [];

  const [istasyonlar, makineler] = await Promise.all([
    getIstasyonlar(),
    getMakineler(),
  ]);
  const istAd = new Map(istasyonlar.map((i) => [i.slug, i.ad]));
  const makineAd = new Map(makineler.map((m) => [m.id, m.ad]));

  // Emrin parçaları: model → BOM satırları, parça → kendisi (miktar 1).
  const bom =
    emir.refTip === "parca"
      ? [{ parcaId: emir.modelId, miktar: 1 }]
      : (
          await db.modelParca.findMany({ where: { modelId: emir.modelId } })
        ).map((mp) => ({ parcaId: mp.parcaId, miktar: Number(mp.miktar) }));
  if (bom.length === 0) return [];

  // Parça emrinde "ürün" alanı: parçanın bağlı olduğu model (yoksa boş).
  let ustModel: { id: string; ad: string } | null = null;
  if (emir.refTip === "parca") {
    const bag = await db.modelParca.findFirst({
      where: { parcaId: emir.modelId },
      include: { stok: { select: { id: true, ad: true } } },
    });
    if (bag?.stok) ustModel = { id: bag.stok.id, ad: bag.stok.ad };
  }

  const parcalar = await db.parca.findMany({
    where: { id: { in: bom.map((b) => b.parcaId) } },
    include: {
      islemler: { orderBy: { sira: "asc" } },
      recete: { include: { stok: { select: { id: true, ad: true } } } },
    },
  });
  const parcaMap = new Map(parcalar.map((p) => [p.id, p]));

  // Görseller
  const [stokDok, parcaDok] = await Promise.all([
    db.stokDokuman.findMany({ select: { stokId: true, url: true, tip: true } }),
    db.parcaDokuman.findMany({
      select: { parcaId: true, url: true, tip: true },
    }),
  ]);
  const stokGorsel = new Map<string, string>();
  for (const [id, d] of gruplaDokuman(stokDok, "stokId"))
    stokGorsel.set(id, tumGorseller(d)[0] ?? "");
  const parcaGorsel = new Map<string, string>();
  for (const [id, d] of gruplaDokuman(parcaDok, "parcaId"))
    parcaGorsel.set(id, tumGorseller(d)[0] ?? "");

  const pvcMi = (ad: string) => /PVC|BANT/i.test(ad);
  const sayi = (v: unknown) => (v == null ? undefined : Number(v));

  return bom.map((b, i) => {
    const p = parcaMap.get(b.parcaId);
    const receteSatirlari = (p?.recete ?? []).filter((r) => r.stok);
    const pvcler = receteSatirlari
      .filter((r) => pvcMi(r.stok!.ad))
      .map((r) => r.stok!.ad);
    // Ana plaka: PVC olmayanlar arasında en çok tüketilen.
    const plaka = receteSatirlari
      .filter((r) => !pvcMi(r.stok!.ad))
      .sort((a, c) => Number(c.miktar) - Number(a.miktar))[0];

    return {
      emirId: emir.id,
      emirTarihi: tarihStr(emir.olusturma),
      termin: emir.termin ? tarihStr(emir.termin) : undefined,
      musteri: emir.musteri ?? undefined,
      hedefDepo: emir.hedefDepo ?? undefined,
      barkod: kodBarkod(`${emir.id}${b.parcaId}`),
      urunId: ustModel?.id ?? (emir.refTip === "parca" ? "" : emir.modelId),
      urunAd: ustModel?.ad ?? (emir.refTip === "parca" ? "" : emir.modelAd),
      parcaId: b.parcaId,
      parcaAd: p?.ad ?? b.parcaId,
      sayfaNo: i + 1,
      sayfaToplam: bom.length,
      miktar: emir.adet * b.miktar,
      malzeme: plaka?.stok?.ad,
      pvcler,
      olculer: p
        ? {
            kabaUzunluk: sayi(p.kabaUzunluk),
            kabaGenislik: sayi(p.kabaGenislik),
            netUzunluk: sayi(p.netUzunluk),
            netGenislik: sayi(p.netGenislik),
            bitmisUzunluk: sayi(p.bitmisUzunluk),
            bitmisGenislik: sayi(p.bitmisGenislik),
            kalinlik: sayi(p.kalinlik),
          }
        : undefined,
      islemler: (p?.islemler ?? []).map((x) => ({
        sira: x.sira,
        istasyonAd: istAd.get(x.istasyon) ?? x.istasyon,
        makineAd: x.makineId ? makineAd.get(x.makineId) : undefined,
        operasyon: x.operasyon,
      })),
      urunGorsel:
        stokGorsel.get(ustModel?.id ?? emir.modelId) || undefined,
      parcaGorsel: parcaGorsel.get(b.parcaId) || undefined,
    };
  });
}

/** İstasyona bağlı makineler (refakat kağıdı işlem sırası için). */
export async function getMakineler(): Promise<import("../data").Makine[]> {
  const rows = await db.makine.findMany({
    orderBy: [{ istasyon: "asc" }, { sira: "asc" }],
  });
  return rows.map((m) => ({
    id: m.id,
    ad: m.ad,
    istasyon: m.istasyon,
    sira: m.sira,
    durum: m.durum as Durum,
  }));
}

/** Üretim planlama formunun ihtiyaç duyduğu hafif müşteri görünümü. */
export type MusteriSecim = { id: string; ad: string; sehir: string };

export async function getMusteriler(): Promise<MusteriSecim[]> {
  // Müşteri seçenekleri cari kartlardan gelir (tip Müşteri / Her İkisi).
  const rows = await db.cari.findMany({
    where: { tip: { in: ["Müşteri", "Her İkisi"] }, durum: "Aktif" },
    select: { id: true, ad: true, sehir: true },
    orderBy: { ad: "asc" },
  });
  return rows.map((m) => ({
    id: m.id,
    ad: m.ad,
    sehir: m.sehir ?? "",
  }));
}

export async function getSiparisler(): Promise<Siparis[]> {
  const rows = await db.siparis.findMany();
  return rows
    .map((s) => ({
      id: s.id,
      musteri: s.musteriAd,
      tarih: tarihStr(s.tarih),
      tutar: Number(s.tutar),
      durum: s.durum as SiparisDurum,
      urunAdedi: s.urunAdedi,
    }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Müşteriler + sipariş bazlı türetilmiş özet (siparişSayisi, toplamHarcama). */
export async function getMusterilerDetay(): Promise<Musteri[]> {
  const [musteriRows, siparisRows] = await Promise.all([
    db.musteri.findMany(),
    db.siparis.findMany(),
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
  const [urunRows, siparisRows, musteriSayisi] = await Promise.all([
    db.stok.findMany({
      where: { grup: "Mamül" },
      select: { stokMiktar: true },
    }),
    db.siparis.findMany(),
    db.musteri.count(),
  ]);
  const stokAdet = (u: { stokMiktar: unknown }) => Number(u.stokMiktar);
  return {
    toplamCiro: siparisRows
      .filter((s) => s.durum !== "İptal")
      .reduce((t, s) => t + Number(s.tutar), 0),
    siparisSayisi: siparisRows.length,
    urunSayisi: urunRows.length,
    musteriSayisi,
    kritikStok: urunRows.filter((u) => stokAdet(u) > 0 && stokAdet(u) <= 5).length,
    tukenenStok: urunRows.filter((u) => stokAdet(u) === 0).length,
  };
}

/** Tanımlı roller (kullanıcı formu + filtreler için). */
export async function getRoller(): Promise<string[]> {
  const rows = await db.rol.findMany({ orderBy: { id: "asc" } });
  return rows.map((r) => r.ad);
}

/** Tanımlı departmanlar. */
export async function getDepartmanlar(): Promise<string[]> {
  const rows = await db.departman.findMany({ orderBy: { id: "asc" } });
  return rows.map((d) => d.ad);
}

/** Tüm rollerin yetki matrisi: rolAd → (modulId → bayraklar). */
export async function getRolYetkileri(): Promise<
  import("../yetki").YetkiMatrisi
> {
  const rows = await db.rolYetki.findMany();
  const matris: import("../yetki").YetkiMatrisi = {};
  for (const r of rows) {
    (matris[r.rolAd] ??= {})[r.modul] = {
      isList: r.isList,
      isAdd: r.isAdd,
      isUpdate: r.isUpdate,
      isDelete: r.isDelete,
    };
  }
  return matris;
}

/** Kullanıcı bazlı yetkiler: kullaniciId → (modulId → bayraklar). */
export async function getKullaniciYetkileri(): Promise<
  import("../yetki").YetkiMatrisi
> {
  const rows = await db.kullaniciYetki.findMany();
  const matris: import("../yetki").YetkiMatrisi = {};
  for (const r of rows) {
    (matris[r.kullaniciId] ??= {})[r.modul] = {
      isList: r.isList,
      isAdd: r.isAdd,
      isUpdate: r.isUpdate,
      isDelete: r.isDelete,
    };
  }
  return matris;
}

/** Tüm yetki setleri (izin şablonları) + detayları. */
export async function getYetkiSetleri(): Promise<
  import("../yetki").YetkiSeti[]
> {
  const rows = await db.yetkiSeti.findMany({
    include: { detaylar: true },
    orderBy: { ad: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    ad: s.ad,
    yetkiler: Object.fromEntries(
      s.detaylar.map((d) => [
        d.modul,
        {
          isList: d.isList,
          isAdd: d.isAdd,
          isUpdate: d.isUpdate,
          isDelete: d.isDelete,
        },
      ]),
    ),
  }));
}

/** Kullanıcı → (cariId → {goruntule, islemYap}). Kayıt yoksa o cari tam açık. */
export async function getKullaniciCariYetkileri(): Promise<
  Record<string, Record<string, import("../yetki").CariYetki>>
> {
  const rows = await db.kullaniciCariYetki.findMany();
  const map: Record<string, Record<string, import("../yetki").CariYetki>> = {};
  for (const r of rows) {
    (map[r.kullaniciId] ??= {})[r.cariId] = {
      goruntule: r.goruntule,
      islemYap: r.islemYap,
    };
  }
  return map;
}

/** Kullanıcı listesi görünümü (şifre hash'i asla dışarı çıkmaz). */
export type KullaniciGorunum = {
  id: string;
  kullaniciAdi: string;
  adSoyad: string;
  email?: string;
  telefon?: string;
  departman?: string;
  /** Üretim departmanındaki kullanıcının çalıştığı istasyon. */
  istasyon?: string;
  rol: string;
  durum: Durum;
  /** Geçmiş tarihe işlem girebilir mi? */
  eskiTarihliIslem: boolean;
  olusturma: string;
};

export async function getKullanicilar(): Promise<KullaniciGorunum[]> {
  const rows = await db.kullanici.findMany({ orderBy: { id: "asc" } });
  return rows.map((k) => ({
    id: k.id,
    kullaniciAdi: k.kullaniciAdi,
    adSoyad: k.adSoyad,
    email: k.email ?? undefined,
    telefon: k.telefon ?? undefined,
    departman: k.departman ?? undefined,
    istasyon: k.istasyon ?? undefined,
    rol: k.rol,
    durum: k.durum as Durum,
    eskiTarihliIslem: k.eskiTarihliIslem,
    olusturma: tarihStr(k.olusturma),
  }));
}

/** Sunucudaki kullanıcı veritabanları (login formundaki seçim için). */
export async function getVeritabanlari(): Promise<string[]> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name`;
  return rows.map((r) => r.name);
}

export async function getUretimEmirleri(): Promise<UretimEmri[]> {
  const rows = await db.uretimEmri.findMany();
  const sirali = rows.sort((a, b) => b.id.localeCompare(a.id));
  return sirali.map((e) => ({
    id: e.id,
    refTip: e.refTip as "model" | "parca",
    urunId: e.modelId,
    urunAd: e.modelAd,
    adet: e.adet,
    durum: e.durum as UretimDurum,
    oncelik: (e.oncelik ?? undefined) as UretimOncelik | undefined,
    olusturma: tarihStr(e.olusturma),
    terminBaslangic: e.terminBaslangic ? tarihStr(e.terminBaslangic) : undefined,
    termin: e.termin ? tarihStr(e.termin) : undefined,
    kaynakSiparis: e.kaynakSiparis ?? undefined,
    musteri: e.musteri ?? undefined,
    hedefDepo: e.hedefDepo ?? undefined,
    not: e.not ?? undefined,
  }));
}

/** Stok grup ağacı — düz liste döner; ağacı istemci kurar. */
export async function getGruplar(): Promise<StokGrup[]> {
  const [rows, stokRows] = await Promise.all([
    db.grup.findMany({ orderBy: [{ sira: "asc" }, { kod: "asc" }, { ad: "asc" }] }),
    db.stok.findMany({ select: { altGrup: true } }),
  ]);
  // Kullanım: grubu (altGrup adı) kullanan stok kartı sayısı.
  const kullanim = new Map<string, number>();
  for (const s of stokRows)
    if (s.altGrup) kullanim.set(s.altGrup, (kullanim.get(s.altGrup) ?? 0) + 1);
  return rows.map((g) => ({
    id: g.id,
    ad: g.ad,
    kod: g.kod,
    ustId: g.ustId,
    sira: g.sira,
    durum: g.durum as Durum,
    kullanim: kullanim.get(g.ad) ?? 0,
  }));
}

/**
 * Üretim istasyonları (rota + 3D + bölüm). Tablo boşsa fabrika.ts'teki
 * varsayılan 6 istasyonu bir kez seed eder (idempotent).
 */
export async function getIstasyonlar(): Promise<Istasyon[]> {
  const adet = await db.istasyon.count();
  if (adet === 0) {
    await db.istasyon.createMany({
      data: ISTASYONLAR.map((i, idx) => ({
        id: i.slug,
        ad: i.ad,
        sira: idx + 1,
        renk: i.renk,
        konumX: i.konum.x,
        konumZ: i.konum.z,
        konumG: i.konum.g,
        konumD: i.konum.d,
      })),
    });
  }
  const rows = await db.istasyon.findMany({ orderBy: { sira: "asc" } });
  return rows.map((r) => ({
    slug: r.id,
    ad: r.ad,
    sira: r.sira,
    konum: {
      x: Number(r.konumX),
      z: Number(r.konumZ),
      g: Number(r.konumG),
      d: Number(r.konumD),
    },
    renk: r.renk,
    durum: r.durum as Durum,
  }));
}

/**
 * Düz tanımlar (marka/koleksiyon/renk/kumaş/birim) — kullanım adetleriyle.
 * adet: marka → model sayısı, birim → malzeme sayısı, renk/kumaş → varyant
 * sayısı, koleksiyon → 0 (henüz bağlanan alan yok).
 */
/** Stok "tip" tanımının varsayılan kalemleri (ayna senkronunun dayandığı set). */
const VARSAYILAN_STOK_TIPLERI = ["Hammadde", "Yarı Mamül", "Mamül", "Hizmet"];
/** Birim tanımının başlangıç tohumu (yalnız tablo boşken bir kez eklenir). */
const VARSAYILAN_BIRIMLER = ["adet", "m", "m²", "m³", "kg", "lt", "takım"];

export async function getTanimlar(): Promise<Record<TanimTip, TanimKalemi[]>> {
  // Stok tipleri her zaman bulunsun (idempotent). SQL Server createMany
  // skipDuplicates desteklemez → var olanları çıkar, eksikleri ekle.
  const mevcutTipler = await db.tanim.findMany({
    where: { tip: "tip" },
    select: { ad: true },
  });
  const mevcutSet = new Set(mevcutTipler.map((t) => t.ad));
  const eksikTipler = VARSAYILAN_STOK_TIPLERI.filter((ad) => !mevcutSet.has(ad));
  if (eksikTipler.length > 0) {
    await db.tanim.createMany({
      data: eksikTipler.map((ad) => ({ tip: "tip", ad })),
    });
  }

  // Birimler bir KEZ tohumlanır: hiç birim yoksa varsayılanları ekle. Tip'ten
  // farklı olarak eksikleri sürekli geri eklemez — kullanıcı istediğini silebilsin.
  const birimSayisi = await db.tanim.count({ where: { tip: "birim" } });
  if (birimSayisi === 0) {
    await db.tanim.createMany({
      data: VARSAYILAN_BIRIMLER.map((ad) => ({ tip: "birim", ad })),
    });
  }

  const [rows, stokRows] = await Promise.all([
    db.tanim.findMany({ orderBy: { ad: "asc" } }),
    db.stok.findMany({
      select: {
        grup: true,
        cins: true,
        marka: true,
        model: true,
        bolum: true,
        renkKodu: true,
        stokBirimi: true,
        varyantlarJson: true,
      },
    }),
  ]);

  const say = (m: Map<string, number>, k: string | null | undefined) => {
    if (!k) return;
    m.set(k, (m.get(k) ?? 0) + 1);
  };
  const markaAdet = new Map<string, number>();
  const renkAdet = new Map<string, number>();
  const kumasAdet = new Map<string, number>();
  const birimAdet = new Map<string, number>();
  const tipAdet = new Map<string, number>();
  const cinsAdet = new Map<string, number>();
  const modelAdet = new Map<string, number>();
  const bolumAdet = new Map<string, number>();
  const renkKoduAdet = new Map<string, number>();
  for (const s of stokRows) {
    say(tipAdet, s.grup);
    say(cinsAdet, s.cins);
    say(markaAdet, s.marka);
    say(modelAdet, s.model);
    say(bolumAdet, s.bolum);
    say(renkKoduAdet, s.renkKodu);
    say(birimAdet, s.stokBirimi);
    const varyantlar = parseJson<ModelVaryant[]>(s.varyantlarJson) ?? [];
    for (const v of varyantlar) {
      say(renkAdet, v.renk);
      say(kumasAdet, v.kumas);
    }
  }

  const adetMap: Record<TanimTip, Map<string, number>> = {
    cins: cinsAdet,
    tip: tipAdet,
    marka: markaAdet,
    model: modelAdet,
    bolum: bolumAdet,
    renkKodu: renkKoduAdet,
    koleksiyon: new Map(),
    renk: renkAdet,
    kumas: kumasAdet,
    birim: birimAdet,
    ulke: new Map(),
    bolge: new Map(),
    sehir: new Map(),
    semt: new Map(),
  };

  const sonuc: Record<TanimTip, TanimKalemi[]> = {
    cins: [],
    tip: [],
    marka: [],
    model: [],
    bolum: [],
    renkKodu: [],
    koleksiyon: [],
    renk: [],
    kumas: [],
    birim: [],
    ulke: [],
    bolge: [],
    sehir: [],
    semt: [],
  };
  for (const r of rows) {
    const tip = r.tip as TanimTip;
    if (!(tip in sonuc)) continue;
    sonuc[tip].push({
      id: r.id,
      ad: r.ad,
      adet: adetMap[tip].get(r.ad) ?? 0,
      durum: r.durum as Durum,
      cinsler: r.cinsler
        ? r.cinsler.split(",").filter(Boolean)
        : undefined,
    });
  }
  return sonuc;
}

/** Cari kartın alt kayıtları (banka/şube/yetkili/CRM/doküman) — tek seferde. */
export type CariDetay = {
  bankalar: CariBanka[];
  subeler: CariSube[];
  yetkililer: CariYetkili[];
  crmKayitlari: CariCrm[];
  dokumanlar: CariDokuman[];
};

export async function getCariDetay(cariId: string): Promise<CariDetay> {
  const [bankalar, subeler, yetkililer, crm, dokumanlar] = await Promise.all([
    db.cariBanka.findMany({ where: { cariId } }),
    db.cariSube.findMany({ where: { cariId } }),
    db.cariYetkili.findMany({ where: { cariId } }),
    db.cariCrm.findMany({ where: { cariId }, orderBy: { tarih: "desc" } }),
    db.cariDokuman.findMany({ where: { cariId } }),
  ]);
  return {
    bankalar: bankalar.map((b) => ({
      id: b.id,
      cariId: b.cariId,
      bankaAdi: b.bankaAdi,
      sube: b.sube ?? undefined,
      iban: b.iban ?? undefined,
      aciklama: b.aciklama ?? undefined,
    })),
    subeler: subeler.map((s) => ({
      id: s.id,
      cariId: s.cariId,
      subeAdi: s.subeAdi,
      yetkili: s.yetkili ?? undefined,
      email: s.email ?? undefined,
      telefon: s.telefon ?? undefined,
      aciklama: s.aciklama ?? undefined,
      ulke: s.ulke ?? undefined,
      sehir: s.sehir ?? undefined,
      semt: s.semt ?? undefined,
      adres: s.adres ?? undefined,
    })),
    yetkililer: yetkililer.map((y) => ({
      id: y.id,
      cariId: y.cariId,
      yetkili: y.yetkili,
      gorevi: y.gorevi ?? undefined,
      email: y.email ?? undefined,
      telefon: y.telefon ?? undefined,
      subeAdi: y.subeAdi ?? undefined,
      aciklama: y.aciklama ?? undefined,
    })),
    crmKayitlari: crm.map((k) => ({
      id: k.id,
      cariId: k.cariId,
      tarih: tarihStr(k.tarih),
      personel: k.personel ?? undefined,
      tip: k.tip as CariCrm["tip"],
      durum: k.durum as CariCrm["durum"],
      aciklama: k.aciklama ?? undefined,
    })),
    dokumanlar: dokumanlar.map((d) => ({
      id: d.id,
      cariId: d.cariId,
      ad: d.ad,
      url: d.url,
    })),
  };
}

// ── Satın alma ──────────────────────────────────────────────────────────

type AlisRow = Awaited<ReturnType<typeof db.alis.findMany>>[number] & {
  satirlar: {
    id: number;
    malzemeId: string;
    malzemeAd: string;
    miktar: unknown;
    birim: string;
    birimFiyat: unknown;
  }[];
};

function mapAlis(a: AlisRow): Alis {
  return {
    id: a.id,
    cariId: a.cariId ?? "",
    cariAd: a.cariAd,
    tarih: tarihStr(a.tarih),
    depo: a.depo,
    belgeNo: a.belgeNo ?? undefined,
    aciklama: a.aciklama ?? undefined,
    toplam: Number(a.toplam),
    satirlar: a.satirlar.map((s) => ({
      id: s.id,
      malzemeId: s.malzemeId,
      malzemeAd: s.malzemeAd,
      miktar: Number(s.miktar),
      birim: s.birim,
      birimFiyat: Number(s.birimFiyat),
    })),
  };
}

/** Kayıtlı döviz kurları (TCMB) — kod sırasıyla. */
// ── Satın alma talepleri ────────────────────────────────────────────────
type TalepRow = Awaited<
  ReturnType<typeof db.satinAlmaTalep.findMany>
>[number] & {
  satirlar: {
    id: number;
    malzemeId: string;
    malzemeAd: string;
    miktar: unknown;
    birim: string;
    tedarikEdilen: unknown;
    cariId: string | null;
    cariAd: string | null;
    tahminiFiyat: unknown;
    satirDurum: string;
    siparisler: {
      id: number;
      siparisId: string | null;
      cariId: string;
      cariAd: string;
      miktar: unknown;
      fiyat: unknown;
      tarih: Date;
      tedarikEdilen: unknown;
      alisIds: string | null;
    }[];
  }[];
};

function mapTalep(
  t: TalepRow,
  fiyatlar: Map<string, { fiyat: number; ureticiCariId?: string }>,
): import("../data").SatinAlmaTalep {
  const satirlar = t.satirlar.map((s) => ({
    id: s.id,
    malzemeId: s.malzemeId,
    malzemeAd: s.malzemeAd,
    miktar: Number(s.miktar),
    birim: s.birim,
    tedarikEdilen: Number(s.tedarikEdilen),
    // Talepte kaydedilen fiyat öncelikli; yoksa güncel stok maliyeti.
    tahminiFiyat:
      s.tahminiFiyat != null
        ? Number(s.tahminiFiyat)
        : (fiyatlar.get(s.malzemeId)?.fiyat ?? 0),
    // Sipariş verilirken önerilecek firma: talepte seçilen (dağıtım) öncelikli,
    // yoksa malzeme kartındaki üretici.
    ureticiCariId: s.cariId ?? fiyatlar.get(s.malzemeId)?.ureticiCariId,
    durum: s.satirDurum as import("../data").TalepSatirDurum,
    siparisler: s.siparisler.map((o) => ({
      id: o.id,
      siparisId: o.siparisId ?? undefined,
      cariId: o.cariId,
      cariAd: o.cariAd,
      miktar: Number(o.miktar),
      fiyat: o.fiyat != null ? Number(o.fiyat) : undefined,
      tarih: tarihStr(o.tarih),
      tedarikEdilen: Number(o.tedarikEdilen),
      alisIds: o.alisIds ? o.alisIds.split(",").filter(Boolean) : undefined,
    })),
  }));
  return {
    id: t.id,
    tarih: tarihStr(t.tarih),
    kaynak: t.kaynak,
    modeller: t.modeller ?? undefined,
    aciklama: t.aciklama ?? undefined,
    // Eski kayıtlar: "Siparişe Döndü" artık Tamamlandı olarak okunur.
    durum: (t.durum === "Siparişe Döndü"
      ? "Tamamlandı"
      : t.durum) as import("../data").TalepDurum,
    alisId: t.alisId ?? undefined,
    depo: t.depo ?? undefined,
    uretimMusteri: t.uretimMusteri ?? undefined,
    uretimTermin: t.uretimTermin ? tarihStr(t.uretimTermin) : undefined,
    uretimOncelik: t.uretimOncelik ?? undefined,
    uretimEmirleri: t.uretimEmirleri
      ? t.uretimEmirleri.split(",").filter(Boolean)
      : undefined,
    olusturanAd: t.olusturanAd ?? undefined,
    onaylayanAd: t.onaylayanAd ?? undefined,
    onayTarihi: t.onayTarihi ? tarihStr(t.onayTarihi) : undefined,
    redNedeni: t.redNedeni ?? undefined,
    baslatanAd: t.baslatanAd ?? undefined,
    baslatmaTarihi: t.baslatmaTarihi ? tarihStr(t.baslatmaTarihi) : undefined,
    satirlar,
    tahminiTutar: satirlar.reduce(
      (top, s) => top + s.miktar * s.tahminiFiyat,
      0,
    ),
  };
}

async function stokFiyatMap(): Promise<
  Map<string, { fiyat: number; ureticiCariId?: string }>
> {
  const rows = await db.stok.findMany({
    select: { id: true, maliyetFiyati: true, ureticiCariId: true },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      {
        fiyat: Number(r.maliyetFiyati),
        ureticiCariId: r.ureticiCariId ?? undefined,
      },
    ]),
  );
}

export async function getTalepler(): Promise<
  import("../data").SatinAlmaTalep[]
> {
  const [rows, fiyatlar] = await Promise.all([
    db.satinAlmaTalep.findMany({
      include: { satirlar: { include: { siparisler: true } } },
      orderBy: { id: "desc" },
    }),
    stokFiyatMap(),
  ]);
  return rows.map((t) => mapTalep(t, fiyatlar));
}

export async function getTalep(
  id: string,
): Promise<import("../data").SatinAlmaTalep | null> {
  const [row, fiyatlar] = await Promise.all([
    db.satinAlmaTalep.findUnique({
      where: { id },
      include: { satirlar: { include: { siparisler: true } } },
    }),
    stokFiyatMap(),
  ]);
  return row ? mapTalep(row, fiyatlar) : null;
}

/** Tek sipariş belgesi — yazdırma/mail çıktısını besler. */
export async function getSatinAlmaSiparis(
  id: string,
): Promise<import("../data").SatinAlmaSiparis | null> {
  const row = await db.satinAlmaSiparis.findUnique({
    where: { id },
    include: { satirlar: { include: { satir: true } } },
  });
  if (!row) return null;
  const kalemler = row.satirlar.map((o) => ({
    malzemeId: o.satir.malzemeId,
    malzemeAd: o.satir.malzemeAd,
    birim: o.satir.birim,
    miktar: Number(o.miktar),
    fiyat: o.fiyat != null ? Number(o.fiyat) : undefined,
    tedarikEdilen: Number(o.tedarikEdilen),
  }));
  // Durum satırların tedarik durumundan türetilir (belgede tutulmaz).
  const gelen = kalemler.reduce((t, k) => t + k.tedarikEdilen, 0);
  const istenen = kalemler.reduce((t, k) => t + k.miktar, 0);
  const durum =
    gelen >= istenen - 1e-9 ? "Kapandı" : gelen > 0 ? "Kısmi" : "Açık";
  return {
    id: row.id,
    talepId: row.talepId,
    cariId: row.cariId,
    cariAd: row.cariAd,
    tarih: tarihStr(row.tarih),
    depo: row.depo ?? undefined,
    notlar: row.notlar ?? undefined,
    durum,
    mailTarihi: row.mailTarihi ? row.mailTarihi.toISOString() : undefined,
    olusturanAd: row.olusturanAd ?? undefined,
    kalemler,
    toplam: kalemler.reduce((t, k) => t + k.miktar * (k.fiyat ?? 0), 0),
  };
}

/**
 * Malzeme bazında alış istihbaratı: son/min/max alış, firma ortalamaları ve
 * son stok hareketi — reçete satırlarındaki fiyat hover kartını besler.
 */
export async function getMalzemeAlisOzetleri(): Promise<
  import("../data").MalzemeAlisOzeti[]
> {
  const [alisRows, hareketRows, sartRows] = await Promise.all([
    db.alisSatiri.findMany({
      include: { alis: { select: { tarih: true } } },
    }),
    db.stokHareket.findMany({
      where: { refTip: "malzeme" },
      orderBy: [{ tarih: "desc" }, { id: "desc" }],
      select: { refId: true, tarih: true, tur: true, aciklama: true },
    }),
    db.stokUretici.findMany({
      select: { stokId: true, cariAd: true, fiyat: true, doviz: true },
    }),
  ]);
  // Malzeme başına anlaşma şartları (fiyata göre azalan).
  const sartGrup = new Map<
    string,
    { cariAd: string; fiyat: number; doviz: import("../data").Doviz }[]
  >();
  for (const s of sartRows) {
    const arr = sartGrup.get(s.stokId) ?? [];
    arr.push({
      cariAd: s.cariAd,
      fiyat: Number(s.fiyat),
      doviz: s.doviz as import("../data").Doviz,
    });
    sartGrup.set(s.stokId, arr);
  }
  for (const arr of sartGrup.values()) arr.sort((a, b) => b.fiyat - a.fiyat);

  type Kayit = { fiyat: number; cariAd: string; tarih: string };
  const grup = new Map<string, Kayit[]>();
  for (const r of alisRows) {
    const arr = grup.get(r.malzemeId) ?? [];
    arr.push({
      fiyat: Number(r.birimFiyat),
      cariAd: r.cariAd,
      tarih: tarihStr(r.alis.tarih),
    });
    grup.set(r.malzemeId, arr);
  }
  const sonHareketler = new Map<
    string,
    { tarih: string; tur: string; aciklama: string }
  >();
  for (const h of hareketRows) {
    if (!sonHareketler.has(h.refId))
      sonHareketler.set(h.refId, {
        tarih: tarihStr(h.tarih),
        tur: h.tur,
        aciklama: h.aciklama,
      });
  }

  const ids = new Set([
    ...grup.keys(),
    ...sonHareketler.keys(),
    ...sartGrup.keys(),
  ]);
  const sonuc: import("../data").MalzemeAlisOzeti[] = [];
  for (const id of ids) {
    const kayitlar = grup.get(id) ?? [];
    const sirali = [...kayitlar].sort((a, b) => b.tarih.localeCompare(a.tarih));
    const min = kayitlar.length
      ? kayitlar.reduce((a, b) => (b.fiyat < a.fiyat ? b : a))
      : undefined;
    const max = kayitlar.length
      ? kayitlar.reduce((a, b) => (b.fiyat > a.fiyat ? b : a))
      : undefined;
    // Firma bazında ortalama fiyat
    const firmalar = new Map<string, { toplam: number; adet: number }>();
    for (const k of kayitlar) {
      const f = firmalar.get(k.cariAd) ?? { toplam: 0, adet: 0 };
      f.toplam += k.fiyat;
      f.adet += 1;
      firmalar.set(k.cariAd, f);
    }
    // En yüksek anlaşma şartı — TL şartlar öncelikli (dövizler karışmasın).
    const sartlar = sartGrup.get(id) ?? [];
    const tlSartlar = sartlar.filter((s) => s.doviz === "TL");
    const maxSart = (tlSartlar.length ? tlSartlar : sartlar)[0];
    sonuc.push({
      malzemeId: id,
      sonAlis: sirali[0],
      minAlis: min,
      maxAlis: max,
      maxSart: maxSart
        ? { fiyat: maxSart.fiyat, cariAd: maxSart.cariAd, doviz: maxSart.doviz }
        : undefined,
      sartlar: sartlar.length ? sartlar : undefined,
      firmaOrtalamalari: [...firmalar.entries()]
        .map(([cariAd, f]) => ({
          cariAd,
          ortalama: f.toplam / f.adet,
          alisSayisi: f.adet,
        }))
        .sort((a, b) => a.ortalama - b.ortalama),
      sonHareket: sonHareketler.get(id),
    });
  }
  return sonuc;
}

/**
 * Satın alma şartları — hangi malzeme hangi firmadan ne fiyata alınıyor.
 * Kaynak stok_uretici (stok kartı Üretici sekmesiyle aynı kayıtlar).
 */
export async function getSatinAlmaSartlari(): Promise<
  import("../data").SatinAlmaSarti[]
> {
  const rows = await db.stokUretici.findMany({
    include: { stok: { select: { ad: true, stokBirimi: true } } },
    orderBy: [{ stokId: "asc" }, { fiyat: "asc" }],
  });
  return rows.map((u) => ({
    id: u.id,
    stokId: u.stokId,
    cariId: u.cariId,
    cariAd: u.cariAd,
    ureticiKodu: u.ureticiKodu ?? undefined,
    fiyat: Number(u.fiyat),
    doviz: u.doviz as import("../data").Doviz,
    minSiparis: u.minSiparis != null ? Number(u.minSiparis) : undefined,
    tedarikGun: u.tedarikGun ?? undefined,
    malzemeAd: u.stok.ad,
    birim: u.stok.stokBirimi,
  }));
}

/**
 * Bekleyen siparişler — tüm taleplerdeki "Sipariş Verildi / Kısmi" satırlar
 * (talep Tedarik Sürecinde), sipariş firması + tahmini teslim ile birleşik.
 * Tahmini teslim = sipariş tarihi + şart tedarik süresi (o malzeme+firma).
 */
export async function getBekleyenSiparisler(): Promise<
  import("../data").BekleyenSiparis[]
> {
  const [siparisRows, stoklar, sartlar, alisRows] = await Promise.all([
    db.satinAlmaTalepSiparis.findMany({
      where: { satir: { talep: { durum: "Tedarik Sürecinde" } } },
      include: {
        satir: {
          select: {
            id: true,
            talepId: true,
            malzemeId: true,
            malzemeAd: true,
            birim: true,
            talep: { select: { modeller: true, depo: true } },
          },
        },
        siparis: { select: { id: true, olusturanAd: true, notlar: true } },
      },
    }),
    db.stok.findMany({ select: { id: true, ad: true, stokBirimi: true } }),
    db.stokUretici.findMany({
      select: { stokId: true, cariId: true, tedarikGun: true },
    }),
    db.alisSatiri.findMany({
      include: { alis: { select: { tarih: true } } },
    }),
  ]);
  // Malzeme başına en güncel alış (firma + fiyat + tarih).
  const sonAlisMap = new Map<
    string,
    { cariAd: string; fiyat: number; tarih: Date }
  >();
  for (const r of alisRows) {
    const mev = sonAlisMap.get(r.malzemeId);
    if (!mev || r.alis.tarih > mev.tarih)
      sonAlisMap.set(r.malzemeId, {
        cariAd: r.cariAd,
        fiyat: Number(r.birimFiyat),
        tarih: r.alis.tarih,
      });
  }
  const stokMap = new Map(stoklar.map((s) => [s.id, s]));
  const tedarikGunMap = new Map(
    sartlar
      .filter((s) => s.tedarikGun != null)
      .map((s) => [`${s.stokId}::${s.cariId}`, s.tedarikGun as number]),
  );
  // Sunucu "bugün" (gecikme kontrolü için gün başlangıcı).
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const sonuc: import("../data").BekleyenSiparis[] = [];
  for (const o of siparisRows) {
    const siparis = Number(o.miktar);
    const gelen = Number(o.tedarikEdilen);
    const kalan = Math.max(0, siparis - gelen);
    if (kalan <= 0.0005) continue;
    const malzemeId = o.satir.malzemeId;
    const gun = tedarikGunMap.get(`${malzemeId}::${o.cariId}`);
    let tahminiTeslim: string | undefined;
    let gecikti = false;
    if (gun != null) {
      const t = new Date(o.tarih);
      t.setDate(t.getDate() + gun);
      tahminiTeslim = tarihStr(t);
      gecikti = t.getTime() < bugun.getTime();
    }
    sonuc.push({
      talepId: o.satir.talepId,
      satirId: o.satir.id,
      siparisId: o.id,
      belgeId: o.siparis?.id,
      malzemeId,
      malzemeAd: o.satir.malzemeAd,
      birim: o.satir.birim,
      cariId: o.cariId,
      cariAd: o.cariAd,
      siparisMiktar: siparis,
      tedarikEdilen: gelen,
      kalan,
      siparisFiyat: o.fiyat != null ? Number(o.fiyat) : undefined,
      siparisTarihi: tarihStr(o.tarih),
      tahminiTeslim,
      gecikti,
      durum: gelen > 0 ? "Kısmi" : "Sipariş Verildi",
      sonAlisCariAd: sonAlisMap.get(malzemeId)?.cariAd,
      sonAlisFiyat: sonAlisMap.get(malzemeId)?.fiyat,
      sonAlisTarih: sonAlisMap.has(malzemeId)
        ? tarihStr(sonAlisMap.get(malzemeId)!.tarih)
        : undefined,
      modeller: o.satir.talep.modeller ?? undefined,
      depo: o.satir.talep.depo ?? undefined,
      olusturanAd: o.siparis?.olusturanAd ?? undefined,
      notlar: o.siparis?.notlar ?? undefined,
    });
  }
  // Firma, sonra tahmini teslim (geciken önce).
  return sonuc.sort((a, b) => {
    if (a.gecikti !== b.gecikti) return a.gecikti ? -1 : 1;
    return a.cariAd.localeCompare(b.cariAd, "tr");
  });
}

export async function getKurlar(): Promise<Kur[]> {
  const rows = await db.kur.findMany({ orderBy: { kod: "asc" } });
  return rows.map((k) => ({
    kod: k.kod,
    ad: k.ad,
    birim: k.birim,
    forexAlis: Number(k.forexAlis),
    forexSatis: Number(k.forexSatis),
    banknoteAlis: Number(k.banknoteAlis),
    banknoteSatis: Number(k.banknoteSatis),
    tarih: k.tarih,
    guncelleme: k.guncelleme.toISOString(),
  }));
}

export async function getAlislar(): Promise<Alis[]> {
  const rows = await db.alis.findMany({ include: { satirlar: true } });
  return rows.map(mapAlis).sort((a, b) => b.id.localeCompare(a.id));
}

export async function getAlis(id: string): Promise<Alis | null> {
  const row = await db.alis.findUnique({
    where: { id },
    include: { satirlar: true },
  });
  return row ? mapAlis(row) : null;
}

/**
 * (malzeme, cari) → o tedarikçiden en son alınan birim fiyat.
 * Yeni Alış formunda satır firması seçilince "son fiyat" bundan gelir.
 */
export async function getSonAlisFiyatlari(): Promise<
  { malzemeId: string; cariId: string; fiyat: number; tarih: string }[]
> {
  const rows = await db.alisSatiri.findMany({
    select: {
      malzemeId: true,
      cariId: true,
      birimFiyat: true,
      alis: { select: { tarih: true, id: true } },
    },
  });
  // En yeni: önce tarih, eşitse ALS-#### kodu (büyük = yeni).
  const enYeni = new Map<
    string,
    { t: number; kod: string; fiyat: number; tarih: string }
  >();
  for (const r of rows) {
    if (!r.cariId) continue;
    const key = `${r.malzemeId}:${r.cariId}`;
    const t = r.alis.tarih.getTime();
    const cur = enYeni.get(key);
    if (!cur || t > cur.t || (t === cur.t && r.alis.id > cur.kod)) {
      enYeni.set(key, {
        t,
        kod: r.alis.id,
        fiyat: Number(r.birimFiyat),
        tarih: tarihStr(r.alis.tarih),
      });
    }
  }
  return [...enYeni.entries()].map(([key, v]) => {
    const [malzemeId, cariId] = key.split(":");
    return { malzemeId, cariId, fiyat: v.fiyat, tarih: v.tarih };
  });
}

// ── Stok kartları ───────────────────────────────────────────────────────

type StokRow = Awaited<ReturnType<typeof db.stok.findMany>>[number];

/** Bir url görsel mi (uzantı ya da data:image). */
function resimUrlMu(url: string) {
  return (
    /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url) ||
    url.startsWith("data:image")
  );
}

/** Dokümanlardan görsel url'lerini sırala (Ürün Resmi öncelikli). */
function tumGorseller(docs: { url: string; tip: string }[]): string[] {
  const resim = docs.filter((d) => resimUrlMu(d.url));
  return [
    ...resim.filter((d) => d.tip === "Ürün Resmi").map((d) => d.url),
    ...resim.filter((d) => d.tip !== "Ürün Resmi").map((d) => d.url),
  ];
}

function mapStok(s: StokRow, miktar: number, gorseller?: string[]): StokKarti {
  const num = (v: unknown) =>
    v == null ? undefined : Number(v) || undefined;
  return {
    id: s.id,
    kod: s.kod ?? undefined,
    ad: s.ad,
    cins: s.cins ?? undefined,
    grup: s.grup as StokKarti["grup"],
    altGrup: s.altGrup ?? undefined,
    detayGrup: s.detayGrup ?? undefined,
    kategori: s.kategori ?? undefined,
    marka: s.marka ?? undefined,
    model: s.model ?? undefined,
    stokBirimi: s.stokBirimi,
    puan: num(s.puan),
    yukseklik: num(s.yukseklik),
    genislik: num(s.genislik),
    boy: num(s.boy),
    kalinlik: num(s.kalinlik),
    agirlik: num(s.agirlik),
    minSiparis: num(s.minSiparis),
    minStok: num(s.minStok),
    maxStok: num(s.maxStok),
    muhasebeKodu: s.muhasebeKodu ?? undefined,
    receteParcaId: s.receteParcaId ?? undefined,
    rota: s.rota ?? undefined,
    ureticiCariId: s.ureticiCariId ?? undefined,
    ureticiKodu: s.ureticiKodu ?? undefined,
    bolum: s.bolum ?? undefined,
    renk: s.renk ?? undefined,
    renkKodu: s.renkKodu ?? undefined,
    barkod: s.barkod ?? kodBarkod(s.id),
    gorsel: gorseller?.[0],
    gorseller,
    aciklama: s.aciklama ?? undefined,
    durum: s.durum as Durum,
    maliyetFiyati: Number(s.maliyetFiyati),
    maliyetBirimi: s.maliyetBirimi as StokKarti["maliyetBirimi"],
    satisFiyat1: Number(s.satisFiyat1),
    satisBirim1: s.satisBirim1 as StokKarti["satisBirim1"],
    satisFiyat2: Number(s.satisFiyat2),
    satisBirim2: s.satisBirim2 as StokKarti["satisBirim2"],
    satisFiyat3: Number(s.satisFiyat3),
    satisBirim3: s.satisBirim3 as StokKarti["satisBirim3"],
    satisFiyat4: Number(s.satisFiyat4),
    satisBirim4: s.satisBirim4 as StokKarti["satisBirim4"],
    satisFiyat5: Number(s.satisFiyat5),
    satisBirim5: s.satisBirim5 as StokKarti["satisBirim5"],
    miktar,
  };
}

/** Stok kartı eldeki miktarları (birleşik tablo, stokMiktar özet kolonu). */
async function stokMiktarlari(): Promise<Map<string, number>> {
  const rows = await db.stok.findMany({ select: { id: true, stokMiktar: true } });
  const m = new Map<string, number>();
  for (const x of rows) m.set(x.id, Number(x.stokMiktar));
  return m;
}

export async function getStoklar(): Promise<StokKarti[]> {
  const [rows, miktarlar, docs] = await Promise.all([
    db.stok.findMany({ orderBy: { id: "asc" } }),
    stokMiktarlari(),
    db.stokDokuman.findMany({ select: { stokId: true, url: true, tip: true } }),
  ]);
  const docsByStok = new Map<string, { url: string; tip: string }[]>();
  for (const d of docs) {
    const arr = docsByStok.get(d.stokId) ?? [];
    arr.push({ url: d.url, tip: d.tip });
    docsByStok.set(d.stokId, arr);
  }
  return rows.map((s) =>
    mapStok(
      s,
      miktarlar.get(s.id) ?? 0,
      tumGorseller(docsByStok.get(s.id) ?? []),
    ),
  );
}

export type StokKartiDetay = {
  ureticiler: StokUretici[];
  musteriler: StokMusteri[];
  dokumanlar: StokDokuman[];
  /** Bu karta ait tüm stok hareketleri (yeni → eski). */
  hareketler: StokHareket[];
  /** Bu karta ait en son stok hareketi (varsa). */
  sonHareket?: StokHareket;
};

export async function getStok(
  id: string,
): Promise<{ kart: StokKarti; detay: StokKartiDetay } | null> {
  const [row, miktarlar, ureticiler, musteriler, dokumanlar, hareketRows] =
    await Promise.all([
      db.stok.findUnique({ where: { id } }),
      stokMiktarlari(),
      db.stokUretici.findMany({ where: { stokId: id } }),
      db.stokMusteri.findMany({ where: { stokId: id } }),
      db.stokDokuman.findMany({ where: { stokId: id } }),
      db.stokHareket.findMany({
        where: { refId: id },
        orderBy: [{ tarih: "desc" }, { id: "desc" }],
      }),
    ]);
  if (!row) return null;
  const hareketler: StokHareket[] = hareketRows.map((h) => ({
    id: h.id,
    tarih: tarihStr(h.tarih),
    tur: h.tur as StokHareketTuru,
    ref:
      h.refTip === "model"
        ? ({ tip: "model", id: h.refId } as const)
        : ({ tip: "malzeme", id: h.refId } as const),
    miktar: Number(h.miktar),
    birim: h.birim,
    depo: h.depo,
    aciklama: h.aciklama,
  }));
  return {
    kart: mapStok(row, miktarlar.get(id) ?? 0),
    detay: {
      hareketler,
      sonHareket: hareketler[0],
      ureticiler: ureticiler.map((u) => ({
        id: u.id,
        stokId: u.stokId,
        cariId: u.cariId,
        cariAd: u.cariAd,
        ureticiKodu: u.ureticiKodu ?? undefined,
        fiyat: Number(u.fiyat),
        doviz: u.doviz as StokUretici["doviz"],
        minSiparis: u.minSiparis != null ? Number(u.minSiparis) : undefined,
        tedarikGun: u.tedarikGun ?? undefined,
      })),
      musteriler: musteriler.map((u) => ({
        id: u.id,
        stokId: u.stokId,
        cariId: u.cariId,
        cariAd: u.cariAd,
        musteriKodu: u.musteriKodu ?? undefined,
        minSiparis: u.minSiparis != null ? Number(u.minSiparis) : undefined,
        fiyat: Number(u.fiyat),
        doviz: u.doviz as StokMusteri["doviz"],
        iskontoOrani:
          u.iskontoOrani != null ? Number(u.iskontoOrani) : undefined,
      })),
      dokumanlar: dokumanlar.map((d) => ({
        id: d.id,
        stokId: d.stokId,
        ad: d.ad,
        url: d.url,
        tip: d.tip as StokDokuman["tip"],
      })),
    },
  };
}
