import "server-only";

import { db, tarihStr } from "./index";
import { ISTASYONLAR, type Istasyon } from "../fabrika";
import type {
  Model,
  ModelVaryant,
  Parca,
  Malzeme,
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
  const [urunRows, upRows] = await Promise.all([
    db.stok.findMany({ where: { grup: "Mamül" }, orderBy: { id: "asc" } }),
    db.modelParca.findMany(),
  ]);
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
    gorsel: u.gorsel ?? undefined,
    parcalar: bomByUrun.get(u.id),
    marka: u.marka ?? undefined,
    barkod: u.barkod ?? undefined,
    agirlik: u.agirlik != null ? Number(u.agirlik) : undefined,
    minStok: u.minStok != null ? Math.round(Number(u.minStok)) : undefined,
    gorseller: parseJson<string[]>(u.gorsellerJson),
    varyantlar: parseJson<ModelVaryant[]>(u.varyantlarJson),
  }));
}

export async function getParcalar(): Promise<Parca[]> {
  const [parcaRows, receteRows] = await Promise.all([
    db.parca.findMany(),
    db.receteSatiri.findMany(),
  ]);
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
  return parcaRows.map((p) => ({
    id: p.id,
    ad: p.ad,
    kategori: p.kategori as ParcaKategori,
    aciklama: p.aciklama ?? undefined,
    durum: p.durum as Durum,
    recete: receteByParca.get(p.id) ?? [],
  }));
}

export async function getMalzemeler(): Promise<Malzeme[]> {
  // Malzeme kartları artık stok tablosunda (grup ∈ Hammadde/Yarı Mamül).
  const rows = await db.stok.findMany({
    where: { grup: { in: ["Hammadde", "Yarı Mamül"] } },
    orderBy: { id: "asc" },
  });
  return rows.map((m) => ({
    id: m.id,
    ad: m.ad,
    grup: m.altGrup ?? m.grup ?? undefined,
    birim: m.stokBirimi,
    stok: Number(m.stokMiktar),
    birimFiyat: Number(m.maliyetFiyati),
    tedarikci: m.ureticiCariId ?? undefined,
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
export async function getFabrikaEmirleri(): Promise<
  import("../fabrika").FabrikaEmri[]
> {
  const rows = await db.uretimEmri.findMany({
    where: { durum: { notIn: ["İptal"] } },
    include: { adimlar: { orderBy: { sira: "asc" } } },
    orderBy: { id: "asc" },
  });
  return rows.map((e) => ({
    id: e.id,
    modelAd: e.modelAd,
    adet: e.adet,
    oncelik: e.oncelik ?? undefined,
    durum: e.durum,
    adimlar: e.adimlar.map((a) => ({
      istasyon: a.istasyon as import("../fabrika").IstasyonSlug,
      sira: a.sira,
      durum: a.durum as import("../fabrika").AdimDurum,
      baslangic: a.baslangic?.toISOString(),
      bitis: a.bitis?.toISOString(),
    })),
  }));
}

/** Üretim planlama formunun ihtiyaç duyduğu hafif müşteri görünümü. */
export type MusteriSecim = { id: string; ad: string; sehir: string };

export async function getMusteriler(): Promise<MusteriSecim[]> {
  const rows = await db.musteri.findMany();
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
    urunId: e.modelId,
    urunAd: e.modelAd,
    adet: e.adet,
    durum: e.durum as UretimDurum,
    oncelik: (e.oncelik ?? undefined) as UretimOncelik | undefined,
    olusturma: tarihStr(e.olusturma),
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
    db.grup.findMany({ orderBy: [{ kod: "asc" }, { ad: "asc" }] }),
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

  const [rows, stokRows] = await Promise.all([
    db.tanim.findMany({ orderBy: { ad: "asc" } }),
    db.stok.findMany({
      select: {
        grup: true,
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
  const modelAdet = new Map<string, number>();
  const bolumAdet = new Map<string, number>();
  const renkKoduAdet = new Map<string, number>();
  for (const s of stokRows) {
    say(tipAdet, s.grup);
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
  { malzemeId: string; cariId: string; fiyat: number }[]
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
    { t: number; kod: string; fiyat: number }
  >();
  for (const r of rows) {
    if (!r.cariId) continue;
    const key = `${r.malzemeId}:${r.cariId}`;
    const t = r.alis.tarih.getTime();
    const cur = enYeni.get(key);
    if (!cur || t > cur.t || (t === cur.t && r.alis.id > cur.kod)) {
      enYeni.set(key, { t, kod: r.alis.id, fiyat: Number(r.birimFiyat) });
    }
  }
  return [...enYeni.entries()].map(([key, v]) => {
    const [malzemeId, cariId] = key.split(":");
    return { malzemeId, cariId, fiyat: v.fiyat };
  });
}

// ── Stok kartları ───────────────────────────────────────────────────────

type StokRow = Awaited<ReturnType<typeof db.stok.findMany>>[number];

function mapStok(s: StokRow, miktar: number): StokKarti {
  const num = (v: unknown) =>
    v == null ? undefined : Number(v) || undefined;
  return {
    id: s.id,
    kod: s.kod ?? undefined,
    ad: s.ad,
    tur: s.tur ?? undefined,
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
    renkKodu: s.renkKodu ?? undefined,
    barkod: s.barkod ?? undefined,
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
  const [rows, miktarlar] = await Promise.all([
    db.stok.findMany({ orderBy: { id: "asc" } }),
    stokMiktarlari(),
  ]);
  return rows.map((s) => mapStok(s, miktarlar.get(s.id) ?? 0));
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
