import "dotenv/config";
import { db, tarihDate } from "./index";
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
  posetler,
} from "../data";

/**
 * Mevcut mock veriyi (src/lib/data.ts) SQL Server'a basar.
 * Idempotent: önce tabloları temizler, sonra ekler. `npm run db:seed`.
 */
async function seed() {
  console.log("Seed başlıyor…");

  // FK-güvenli sırada temizle (alt tablolar önce)
  await db.uretimEmri.deleteMany();
  await db.siparis.deleteMany();
  await db.modelParca.deleteMany();
  await db.receteSatiri.deleteMany();
  await db.model.deleteMany();
  await db.parca.deleteMany();
  await db.malzeme.deleteMany();
  await db.musteri.deleteMany();
  await db.depo.deleteMany();
  await db.cariIslem.deleteMany();
  await db.cari.deleteMany();
  await db.stokHareket.deleteMany();
  await db.posetMalzeme.deleteMany();
  await db.poset.deleteMany();

  // Bağımsız tablolar
  await db.depo.createMany({
    data: depolar.map((d) => ({
      id: d.id,
      ad: d.ad,
      sehir: d.sehir,
      kapasite: d.kapasite,
      doluluk: d.doluluk,
      durum: d.durum,
    })),
  });

  await db.musteri.createMany({
    data: musteriler.map((m) => ({
      id: m.id,
      ad: m.ad,
      email: m.email,
      sehir: m.sehir,
    })),
  });

  await db.malzeme.createMany({
    data: malzemeler.map((m) => ({
      id: m.id,
      ad: m.ad,
      tip: m.tip,
      birim: m.birim,
      stok: m.stok,
      birimFiyat: m.birimFiyat,
      tedarikci: m.tedarikci ?? null,
      durum: m.durum,
    })),
  });

  await db.parca.createMany({
    data: parcalar.map((p) => ({
      id: p.id,
      ad: p.ad,
      kategori: p.kategori,
      aciklama: p.aciklama ?? null,
      durum: p.durum,
    })),
  });

  await db.model.createMany({
    data: urunler.map((u) => ({
      id: u.id,
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
    })),
  });

  // Reçete satırları (parça bileşenleri)
  const receteRows = parcalar.flatMap((p) =>
    p.recete.map((r) => ({
      parcaId: p.id,
      tip: r.bilesen.tip,
      malzemeId: r.bilesen.tip === "malzeme" ? r.bilesen.ref : null,
      altParcaId: r.bilesen.tip === "parca" ? r.bilesen.ref : null,
      miktar: r.miktar,
    })),
  );
  if (receteRows.length) await db.receteSatiri.createMany({ data: receteRows });

  // Ürün-parça (model BOM)
  const modelParcaRows = urunler.flatMap((u) =>
    (u.parcalar ?? []).map((ps) => ({
      modelId: u.id,
      parcaId: ps.parcaId,
      miktar: ps.miktar,
    })),
  );
  if (modelParcaRows.length)
    await db.modelParca.createMany({ data: modelParcaRows });

  // Siparişler (müşteri adından id eşle)
  const musteriByAd = new Map(musteriler.map((m) => [m.ad, m.id]));
  await db.siparis.createMany({
    data: siparisler.map((s) => ({
      id: s.id,
      musteriId: musteriByAd.get(s.musteri) ?? null,
      musteriAd: s.musteri,
      tarih: tarihDate(s.tarih),
      tutar: s.tutar,
      durum: s.durum,
      urunAdedi: s.urunAdedi,
    })),
  });

  // Üretim emirleri
  await db.uretimEmri.createMany({
    data: uretimEmirleri.map((e) => ({
      id: e.id,
      modelId: e.urunId,
      modelAd: e.urunAd,
      adet: e.adet,
      durum: e.durum,
      oncelik: e.oncelik ?? "Normal",
      olusturma: tarihDate(e.olusturma),
      termin: e.termin ? tarihDate(e.termin) : null,
      kaynakSiparis: e.kaynakSiparis ?? null,
      musteri: e.musteri ?? null,
      hedefDepo: e.hedefDepo ?? null,
      not: e.not ?? null,
    })),
  });

  // Cari hesaplar + işlemleri
  await db.cari.createMany({
    data: cariler.map((c) => ({
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
      bakiye: c.bakiye,
      paraBirimi: c.paraBirimi,
      durum: c.durum,
      not: c.not ?? null,
    })),
  });

  if (cariIslemleri.length)
    await db.cariIslem.createMany({
      data: cariIslemleri.map((i) => ({
        id: i.id,
        cariId: i.cariId,
        tarih: tarihDate(i.tarih),
        tur: i.tur,
        tutar: i.tutar,
        belge: i.belge ?? null,
        aciklama: i.aciklama,
      })),
    });

  // Stok hareketleri
  await db.stokHareket.createMany({
    data: stokHareketleri.map((h) => ({
      id: h.id,
      tarih: tarihDate(h.tarih),
      tur: h.tur,
      refTip: h.ref.tip,
      refId: h.ref.id,
      miktar: h.miktar,
      birim: h.birim,
      depo: h.depo,
      aciklama: h.aciklama,
    })),
  });

  // Malzeme poşetleri + içerikleri
  await db.poset.createMany({
    data: posetler.map((p) => ({
      id: p.id,
      ad: p.ad,
      aciklama: p.aciklama ?? null,
      durum: p.durum,
    })),
  });
  const posetMalzemeRows = posetler.flatMap((p) =>
    p.malzemeler.map((m) => ({
      posetId: p.id,
      malzemeId: m.malzemeId,
      miktar: m.miktar,
    })),
  );
  if (posetMalzemeRows.length)
    await db.posetMalzeme.createMany({ data: posetMalzemeRows });

  console.log("Seed tamam ✓");
  console.log(
    `  ${depolar.length} depo · ${musteriler.length} müşteri · ${malzemeler.length} malzeme · ` +
      `${parcalar.length} parça · ${urunler.length} ürün · ${receteRows.length} reçete satırı · ` +
      `${modelParcaRows.length} ürün-parça · ${siparisler.length} sipariş · ${uretimEmirleri.length} üretim emri · ` +
      `${cariler.length} cari · ${cariIslemleri.length} cari işlem · ${stokHareketleri.length} stok hareketi · ` +
      `${posetler.length} poşet`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  });
