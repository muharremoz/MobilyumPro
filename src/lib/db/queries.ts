import "server-only";

import { db, tarihStr } from "./index";
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
  MalzemeTipi,
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
  StokHareket,
  StokHareketTuru,
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
  const [urunRows, upRows] = await Promise.all([
    db.model.findMany(),
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
    kategori: u.kategori as Kategori,
    fiyat: Number(u.fiyat),
    stok: u.stok,
    durum: u.durum as Durum,
    gorsel: u.gorsel ?? undefined,
    parcalar: bomByUrun.get(u.id),
    marka: u.marka ?? undefined,
    barkod: u.barkod ?? undefined,
    agirlik: u.agirlik != null ? Number(u.agirlik) : undefined,
    minStok: u.minStok ?? undefined,
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
  const rows = await db.malzeme.findMany();
  return rows.map((m) => ({
    id: m.id,
    ad: m.ad,
    tip: m.tip as MalzemeTipi,
    birim: m.birim,
    stok: Number(m.stok),
    birimFiyat: Number(m.birimFiyat),
    tedarikci: m.tedarikci ?? undefined,
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

type CariRow = Awaited<ReturnType<typeof db.cari.findMany>>[number];

function mapCari(c: CariRow): Cari {
  return {
    id: c.id,
    ad: c.ad,
    tip: c.tip as CariTip,
    sinif: c.sinif as CariSinifi,
    vergiNo: c.vergiNo ?? undefined,
    vergiDairesi: c.vergiDairesi ?? undefined,
    telefon: c.telefon ?? undefined,
    email: c.email ?? undefined,
    adres: c.adres ?? undefined,
    sehir: c.sehir ?? undefined,
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
    db.model.findMany(),
    db.siparis.findMany(),
    db.musteri.count(),
  ]);
  return {
    toplamCiro: siparisRows
      .filter((s) => s.durum !== "İptal")
      .reduce((t, s) => t + Number(s.tutar), 0),
    siparisSayisi: siparisRows.length,
    urunSayisi: urunRows.length,
    musteriSayisi,
    kritikStok: urunRows.filter((u) => u.stok > 0 && u.stok <= 5).length,
    tukenenStok: urunRows.filter((u) => u.stok === 0).length,
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
