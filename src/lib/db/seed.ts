import "dotenv/config";
import { db } from "./index";
import {
  model,
  parca,
  malzeme,
  receteSatiri,
  modelParca,
  depo,
  musteri,
  siparis,
  uretimEmri,
  cari,
  cariIslem,
  stokHareket,
} from "./schema";
import {
  urunler,
  parcalar,
  malzemeler,
  depolar,
  musteriler,
  siparisler,
  uretimEmirleri,
  cariler,
  cariIslemleri,
  stokHareketleri,
} from "../data";

/**
 * Mevcut mock veriyi (src/lib/data.ts) Postgres'e basar.
 * Idempotent: önce tabloları temizler, sonra ekler. `npm run db:seed`.
 */
async function seed() {
  console.log("Seed başlıyor…");

  // FK-güvenli sırada temizle (alt tablolar önce)
  await db.delete(uretimEmri);
  await db.delete(siparis);
  await db.delete(modelParca);
  await db.delete(receteSatiri);
  await db.delete(model);
  await db.delete(parca);
  await db.delete(malzeme);
  await db.delete(musteri);
  await db.delete(depo);
  await db.delete(cariIslem);
  await db.delete(cari);
  await db.delete(stokHareket);

  // Bağımsız tablolar
  await db.insert(depo).values(
    depolar.map((d) => ({
      id: d.id,
      ad: d.ad,
      sehir: d.sehir,
      kapasite: d.kapasite,
      doluluk: d.doluluk,
      durum: d.durum,
    })),
  );

  await db.insert(musteri).values(
    musteriler.map((m) => ({
      id: m.id,
      ad: m.ad,
      email: m.email,
      sehir: m.sehir,
    })),
  );

  await db.insert(malzeme).values(
    malzemeler.map((m) => ({
      id: m.id,
      ad: m.ad,
      tip: m.tip,
      birim: m.birim,
      stok: String(m.stok),
      birimFiyat: String(m.birimFiyat),
      tedarikci: m.tedarikci ?? null,
      durum: m.durum,
    })),
  );

  await db.insert(parca).values(
    parcalar.map((p) => ({
      id: p.id,
      ad: p.ad,
      kategori: p.kategori,
      aciklama: p.aciklama ?? null,
      durum: p.durum,
    })),
  );

  await db.insert(model).values(
    urunler.map((u) => ({
      id: u.id,
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
    })),
  );

  // Reçete satırları (parça bileşenleri)
  const receteRows = parcalar.flatMap((p) =>
    p.recete.map((r) => ({
      parcaId: p.id,
      tip: r.bilesen.tip,
      malzemeId: r.bilesen.tip === "malzeme" ? r.bilesen.ref : null,
      altParcaId: r.bilesen.tip === "parca" ? r.bilesen.ref : null,
      miktar: String(r.miktar),
    })),
  );
  if (receteRows.length) await db.insert(receteSatiri).values(receteRows);

  // Ürün-parça (model BOM)
  const modelParcaRows = urunler.flatMap((u) =>
    (u.parcalar ?? []).map((ps) => ({
      modelId: u.id,
      parcaId: ps.parcaId,
      miktar: String(ps.miktar),
    })),
  );
  if (modelParcaRows.length) await db.insert(modelParca).values(modelParcaRows);

  // Siparişler (müşteri adından id eşle)
  const musteriByAd = new Map(musteriler.map((m) => [m.ad, m.id]));
  await db.insert(siparis).values(
    siparisler.map((s) => ({
      id: s.id,
      musteriId: musteriByAd.get(s.musteri) ?? null,
      musteriAd: s.musteri,
      tarih: s.tarih,
      tutar: String(s.tutar),
      durum: s.durum,
      urunAdedi: s.urunAdedi,
    })),
  );

  // Üretim emirleri
  await db.insert(uretimEmri).values(
    uretimEmirleri.map((e) => ({
      id: e.id,
      modelId: e.urunId,
      modelAd: e.urunAd,
      adet: e.adet,
      durum: e.durum,
      oncelik: e.oncelik ?? "Normal",
      olusturma: e.olusturma,
      termin: e.termin ?? null,
      kaynakSiparis: e.kaynakSiparis ?? null,
      musteri: e.musteri ?? null,
      hedefDepo: e.hedefDepo ?? null,
      not: e.not ?? null,
    })),
  );

  // Cari hesaplar + işlemleri
  await db.insert(cari).values(
    cariler.map((c) => ({
      id: c.id,
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
    })),
  );

  if (cariIslemleri.length)
    await db.insert(cariIslem).values(
      cariIslemleri.map((i) => ({
        id: i.id,
        cariId: i.cariId,
        tarih: i.tarih,
        tur: i.tur,
        tutar: String(i.tutar),
        belge: i.belge ?? null,
        aciklama: i.aciklama,
      })),
    );

  // Stok hareketleri
  await db.insert(stokHareket).values(
    stokHareketleri.map((h) => ({
      id: h.id,
      tarih: h.tarih,
      tur: h.tur,
      refTip: h.ref.tip,
      refId: h.ref.id,
      miktar: String(h.miktar),
      birim: h.birim,
      depo: h.depo,
      aciklama: h.aciklama,
    })),
  );

  console.log("Seed tamam ✓");
  console.log(
    `  ${depolar.length} depo · ${musteriler.length} müşteri · ${malzemeler.length} malzeme · ` +
      `${parcalar.length} parça · ${urunler.length} ürün · ${receteRows.length} reçete satırı · ` +
      `${modelParcaRows.length} ürün-parça · ${siparisler.length} sipariş · ${uretimEmirleri.length} üretim emri · ` +
      `${cariler.length} cari · ${cariIslemleri.length} cari işlem · ${stokHareketleri.length} stok hareketi`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  });
