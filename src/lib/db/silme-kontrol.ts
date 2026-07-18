import "server-only";

import { db } from "./index";

/**
 * Silme kontrolü — "işlem görmüş kayıt silinmez" kuralının tek yeri.
 *
 * Neden merkezi: engellerin bir kısmı FK ile korunuyor (reçete satırı → stok),
 * ama önemli bir kısmı FK'sız referans (stok_hareket.ref_id, uretim_emri.model_id,
 * stok.cins gibi ad ile bağlananlar). FK'ya güvenmek bu yüzden yetmiyor —
 * hareketi olan bir malzeme FK hatası vermeden silinebiliyordu.
 *
 * Kural: kaydın KENDİ alt kayıtları (doküman, banka, yetkili …) silinmeyi
 * engellemez — onlar kayda aittir ve cascade ile gider. Engel, kaydın BAŞKA
 * bir iş kaydında kullanılmış olmasıdır (hareket, fatura, sipariş, reçete).
 */

/** Silmeyi engelleyen tek bir sebep. */
export type SilmeEngeli = {
  /** Kullanıcıya gösterilecek ad, örn. "stok hareketi". */
  etiket: string;
  adet: number;
};

export type SilmeSonucu = {
  silinebilir: boolean;
  engeller: SilmeEngeli[];
  /** Hazır mesaj — action doğrudan döndürebilir. */
  mesaj?: string;
};

/** Engel listesinden okunur bir cümle kurar. */
function mesajla(ad: string, engeller: SilmeEngeli[]): string | undefined {
  if (engeller.length === 0) return undefined;
  const liste = engeller
    .map((e) => `${e.adet} ${e.etiket}`)
    .join(", ")
    .replace(/, ([^,]*)$/, " ve $1");
  return `${ad} silinemez — ${liste} kaydında kullanılıyor. Bunun yerine Pasif yapabilirsiniz.`;
}

/** Sayımları toplayıp sonuç üretir (0 olanlar elenir). */
async function topla(
  ad: string,
  kontroller: { etiket: string; say: () => Promise<number> }[],
): Promise<SilmeSonucu> {
  const sayimlar = await Promise.all(kontroller.map((k) => k.say()));
  const engeller = kontroller
    .map((k, i) => ({ etiket: k.etiket, adet: sayimlar[i] }))
    .filter((e) => e.adet > 0);
  return {
    silinebilir: engeller.length === 0,
    engeller,
    mesaj: mesajla(ad, engeller),
  };
}

/** Stok kartı (hammadde / yarı mamül / mamül). */
export async function stokSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const kart = await db.stok.findUnique({
    where: { id },
    select: { ad: true, grup: true, stokMiktar: true },
  });
  if (!kart)
    return { silinebilir: false, engeller: [], mesaj: "Kart bulunamadı." };

  const sonuc = await topla(kart.ad, [
    {
      etiket: "stok hareketi",
      say: () => db.stokHareket.count({ where: { refId: id } }),
    },
    {
      etiket: "reçete satırı",
      say: () => db.receteSatiri.count({ where: { malzemeId: id } }),
    },
    {
      etiket: "model ağacı bağlantısı",
      say: () => db.modelParca.count({ where: { modelId: id } }),
    },
    {
      etiket: "alış satırı",
      say: () => db.alisSatiri.count({ where: { malzemeId: id } }),
    },
    {
      etiket: "satın alma talebi satırı",
      say: () => db.satinAlmaTalepSatiri.count({ where: { malzemeId: id } }),
    },
    {
      etiket: "poşet satırı",
      say: () => db.posetMalzeme.count({ where: { malzemeId: id } }),
    },
    {
      etiket: "üretim emri",
      say: () => db.uretimEmri.count({ where: { modelId: id } }),
    },
  ]);
  if (!sonuc.silinebilir) return sonuc;

  // Hareketi yoksa bile eldeki miktar sıfırlanmadan silinmemeli.
  if (Math.abs(Number(kart.stokMiktar)) > 0.0005)
    return {
      silinebilir: false,
      engeller: [{ etiket: "birim stok bakiyesi", adet: 1 }],
      mesaj: `${kart.ad} silinemez — ${Number(kart.stokMiktar).toLocaleString("tr-TR")} birim stok bakiyesi var.`,
    };
  return sonuc;
}

/** Cari hesap (müşteri/tedarikçi). */
export async function cariSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const cari = await db.cari.findUnique({
    where: { id },
    select: { ad: true, bakiye: true },
  });
  if (!cari)
    return { silinebilir: false, engeller: [], mesaj: "Cari bulunamadı." };

  const sonuc = await topla(cari.ad, [
    {
      etiket: "cari hareketi",
      say: () => db.cariIslem.count({ where: { cariId: id } }),
    },
    { etiket: "alış fişi", say: () => db.alis.count({ where: { cariId: id } }) },
    {
      etiket: "satın alma siparişi",
      say: () => db.satinAlmaSiparis.count({ where: { cariId: id } }),
    },
    {
      etiket: "sipariş satırı",
      say: () => db.satinAlmaTalepSiparis.count({ where: { cariId: id } }),
    },
    {
      etiket: "stok kartı tedarikçi kaydı",
      say: () => db.stokUretici.count({ where: { cariId: id } }),
    },
    {
      etiket: "stok kartı müşteri kaydı",
      say: () => db.stokMusteri.count({ where: { cariId: id } }),
    },
    {
      etiket: "stok kartı varsayılan üreticisi",
      say: () => db.stok.count({ where: { ureticiCariId: id } }),
    },
  ]);
  if (!sonuc.silinebilir) return sonuc;

  if (Math.abs(Number(cari.bakiye)) > 0.005)
    return {
      silinebilir: false,
      engeller: [{ etiket: "bakiye", adet: 1 }],
      mesaj: `${cari.ad} silinemez — hesabında bakiye var.`,
    };
  return sonuc;
}

/** Parça (reçete). */
export async function parcaSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const parca = await db.parca.findUnique({
    where: { id },
    select: { ad: true },
  });
  if (!parca)
    return { silinebilir: false, engeller: [], mesaj: "Parça bulunamadı." };

  return topla(parca.ad, [
    {
      etiket: "modelde kullanım",
      say: () => db.modelParca.count({ where: { parcaId: id } }),
    },
    {
      etiket: "başka reçetede alt parça kullanımı",
      say: () => db.receteSatiri.count({ where: { altParcaId: id } }),
    },
    {
      etiket: "bağlı stok kartı",
      say: () => db.stok.count({ where: { receteParcaId: id } }),
    },
    {
      etiket: "üretim emri",
      say: () => db.uretimEmri.count({ where: { modelId: id, refTip: "parca" } }),
    },
  ]);
}

/** Depo. */
export async function depoSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const depo = await db.depo.findUnique({
    where: { id },
    select: { ad: true },
  });
  if (!depo)
    return { silinebilir: false, engeller: [], mesaj: "Depo bulunamadı." };
  // Depo kayıtlarda ADIYLA tutulur (id değil) — ikisini de ara.
  const ref = { in: [depo.ad, id] };
  return topla(depo.ad, [
    {
      etiket: "stok hareketi",
      say: () => db.stokHareket.count({ where: { depo: ref } }),
    },
    { etiket: "alış fişi", say: () => db.alis.count({ where: { depo: ref } }) },
    {
      etiket: "üretim emri",
      say: () => db.uretimEmri.count({ where: { hedefDepo: ref } }),
    },
    {
      etiket: "satın alma talebi",
      say: () => db.satinAlmaTalep.count({ where: { depo: ref } }),
    },
    {
      etiket: "satın alma siparişi",
      say: () => db.satinAlmaSiparis.count({ where: { depo: ref } }),
    },
  ]);
}

/** Tanım (cins / marka / renk / birim / tip / bölüm …) — tipine göre kullanım. */
export async function tanimSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const t = await db.tanim.findUnique({
    where: { id },
    select: { ad: true, tip: true },
  });
  if (!t)
    return { silinebilir: false, engeller: [], mesaj: "Tanım bulunamadı." };

  const kontroller: { etiket: string; say: () => Promise<number> }[] = [];
  const stokta = (alan: "cins" | "marka" | "renk" | "stokBirimi" | "bolum" | "grup" | "model") =>
    db.stok.count({ where: { [alan]: t.ad } });

  switch (t.tip) {
    case "cins":
      kontroller.push({ etiket: "stok kartı", say: () => stokta("cins") });
      // Cins silinince ona bağlanmış renklerin bağı kırılır.
      kontroller.push({
        etiket: "renk tanımı bağlantısı",
        say: () =>
          db.tanim.count({
            where: { tip: "renk", cinsler: { contains: t.ad } },
          }),
      });
      break;
    case "marka":
      kontroller.push({ etiket: "stok kartı", say: () => stokta("marka") });
      break;
    case "renk":
      kontroller.push({ etiket: "stok kartı", say: () => stokta("renk") });
      break;
    case "birim":
      kontroller.push({ etiket: "stok kartı", say: () => stokta("stokBirimi") });
      break;
    case "tip":
      kontroller.push({ etiket: "stok kartı", say: () => stokta("grup") });
      break;
    case "bolum":
      kontroller.push({ etiket: "stok kartı", say: () => stokta("bolum") });
      break;
    case "model":
      kontroller.push({ etiket: "stok kartı", say: () => stokta("model") });
      break;
    default:
      break;
  }
  return topla(t.ad, kontroller);
}

/** Stok grubu (ağaç düğümü). */
export async function grupSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const g = await db.grup.findUnique({
    where: { id },
    select: { ad: true },
  });
  if (!g)
    return { silinebilir: false, engeller: [], mesaj: "Grup bulunamadı." };
  return topla(g.ad, [
    {
      etiket: "alt grup",
      say: () => db.grup.count({ where: { ustId: id } }),
    },
    {
      etiket: "stok kartı",
      say: () =>
        db.stok.count({
          where: {
            OR: [{ altGrup: g.ad }, { detayGrup: g.ad }, { kategori: g.ad }],
          },
        }),
    },
  ]);
}

/** İstasyon (fabrika rotası). */
export async function istasyonSilinebilirMi(
  id: string,
): Promise<SilmeSonucu> {
  // İstasyonun id'si slug'ıdır (kesim, bantlama …).
  const i = await db.istasyon.findUnique({
    where: { id },
    select: { ad: true },
  });
  if (!i)
    return { silinebilir: false, engeller: [], mesaj: "İstasyon bulunamadı." };
  const ref = { in: [id, i.ad] };
  return topla(i.ad, [
    {
      etiket: "reçete satırı",
      say: () => db.receteSatiri.count({ where: { istasyon: ref } }),
    },
    {
      etiket: "üretim emri adımı",
      say: () => db.uretimEmriAdim.count({ where: { istasyon: ref } }),
    },
    {
      etiket: "stok hareketi",
      say: () => db.stokHareket.count({ where: { istasyon: ref } }),
    },
    {
      etiket: "stok kartı bölümü",
      say: () => db.stok.count({ where: { bolum: ref } }),
    },
  ]);
}

/** Poşet. */
export async function posetSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const p = await db.poset.findUnique({
    where: { id },
    select: { ad: true },
  });
  if (!p)
    return { silinebilir: false, engeller: [], mesaj: "Poşet bulunamadı." };
  // Poşetin kendi malzeme satırları engel değil (cascade); dışarıdan
  // referans olursa buraya eklenecek.
  return topla(p.ad, []);
}

/** Kullanıcı — kendi yetkileri engel değil; iş kayıtlarındaki izler engeldir. */
export async function kullaniciSilinebilirMi(id: string): Promise<SilmeSonucu> {
  const k = await db.kullanici.findUnique({
    where: { id },
    select: { adSoyad: true },
  });
  if (!k)
    return { silinebilir: false, engeller: [], mesaj: "Kullanıcı bulunamadı." };
  const ad = k.adSoyad;
  return topla(ad, [
    {
      etiket: "oluşturduğu satın alma talebi",
      say: () => db.satinAlmaTalep.count({ where: { olusturanAd: ad } }),
    },
    {
      etiket: "onayladığı satın alma talebi",
      say: () => db.satinAlmaTalep.count({ where: { onaylayanAd: ad } }),
    },
    {
      etiket: "oluşturduğu sipariş",
      say: () => db.satinAlmaSiparis.count({ where: { olusturanAd: ad } }),
    },
  ]);
}
