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

/** Kullanım listesinde gösterilen örnek kayıt sayısı. */
const ORNEK_LIMIT = 5;

/** Silmeyi engelleyen tek bir sebep. */
export type SilmeEngeli = {
  /** Kullanıcıya gösterilecek ad, örn. "stok hareketi". */
  etiket: string;
  adet: number;
  /** Kullanıldığı yerlerden örnekler (en fazla ORNEK_LIMIT kayıt). */
  ornekler?: string[];
};

export type SilmeSonucu = {
  silinebilir: boolean;
  /** Kontrol edilen kaydın görünen adı (detay başlıkları için). */
  ad?: string;
  engeller: SilmeEngeli[];
  /** Hazır mesaj — action doğrudan döndürebilir. */
  mesaj?: string;
};

type Kontrol = {
  etiket: string;
  say: () => Promise<number>;
  /** Engel varsa gösterilecek örnek kayıtlar (kullanım yerleri). */
  ornekler?: () => Promise<string[]>;
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

/** Sayımları toplayıp sonuç üretir; engellilerin örnek kayıtlarını da çeker. */
async function topla(ad: string, kontroller: Kontrol[]): Promise<SilmeSonucu> {
  const sayimlar = await Promise.all(kontroller.map((k) => k.say()));
  const engelli = kontroller
    .map((k, i) => ({ k, adet: sayimlar[i] }))
    .filter((e) => e.adet > 0);
  const engeller = await Promise.all(
    engelli.map(async (e) => ({
      etiket: e.k.etiket,
      adet: e.adet,
      ornekler: e.k.ornekler ? await e.k.ornekler() : undefined,
    })),
  );
  return {
    silinebilir: engeller.length === 0,
    ad,
    engeller,
    mesaj: mesajla(ad, engeller),
  };
}

const tekil = (arr: string[]) => [...new Set(arr)];

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
      ornekler: () =>
        db.stokHareket
          .findMany({
            where: { refId: id },
            take: ORNEK_LIMIT,
            orderBy: { id: "desc" },
            select: { id: true, tur: true },
          })
          .then((r) => r.map((x) => `${x.id} (${x.tur})`)),
    },
    {
      etiket: "reçete satırı",
      say: () => db.receteSatiri.count({ where: { malzemeId: id } }),
      ornekler: () =>
        db.receteSatiri
          .findMany({
            where: { malzemeId: id },
            take: ORNEK_LIMIT,
            select: { parca: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.parca.ad))),
    },
    {
      etiket: "model ağacı bağlantısı",
      say: () => db.modelParca.count({ where: { modelId: id } }),
      ornekler: () =>
        db.modelParca
          .findMany({
            where: { modelId: id },
            take: ORNEK_LIMIT,
            select: { parca: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.parca.ad))),
    },
    {
      etiket: "alış satırı",
      say: () => db.alisSatiri.count({ where: { malzemeId: id } }),
      ornekler: () =>
        db.alisSatiri
          .findMany({
            where: { malzemeId: id },
            take: ORNEK_LIMIT,
            select: { alisId: true },
          })
          .then((r) => tekil(r.map((x) => x.alisId))),
    },
    {
      etiket: "satın alma talebi satırı",
      say: () => db.satinAlmaTalepSatiri.count({ where: { malzemeId: id } }),
      ornekler: () =>
        db.satinAlmaTalepSatiri
          .findMany({
            where: { malzemeId: id },
            take: ORNEK_LIMIT,
            select: { talepId: true },
          })
          .then((r) => tekil(r.map((x) => x.talepId))),
    },
    {
      etiket: "poşet satırı",
      say: () => db.posetMalzeme.count({ where: { malzemeId: id } }),
      ornekler: () =>
        db.posetMalzeme
          .findMany({
            where: { malzemeId: id },
            take: ORNEK_LIMIT,
            select: { poset: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.poset.ad))),
    },
    {
      etiket: "malzeme poşeti bağlantısı",
      say: () =>
        db.poset.count({ where: { refTip: "model", refId: id } }),
      ornekler: () =>
        db.poset
          .findMany({
            where: { refTip: "model", refId: id },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    },
    {
      etiket: "üretim emri",
      say: () => db.uretimEmri.count({ where: { modelId: id } }),
      ornekler: () =>
        db.uretimEmri
          .findMany({
            where: { modelId: id },
            take: ORNEK_LIMIT,
            select: { id: true, durum: true },
          })
          .then((r) => r.map((x) => `${x.id} (${x.durum})`)),
    },
  ]);
  if (!sonuc.silinebilir) return sonuc;

  // Hareketi yoksa bile eldeki miktar sıfırlanmadan silinmemeli.
  if (Math.abs(Number(kart.stokMiktar)) > 0.0005)
    return {
      silinebilir: false,
      ad: kart.ad,
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
      ornekler: () =>
        db.cariIslem
          .findMany({
            where: { cariId: id },
            take: ORNEK_LIMIT,
            orderBy: { id: "desc" },
            select: { id: true, tur: true },
          })
          .then((r) => r.map((x) => `${x.id} (${x.tur})`)),
    },
    {
      etiket: "alış fişi",
      say: () => db.alis.count({ where: { cariId: id } }),
      ornekler: () =>
        db.alis
          .findMany({
            where: { cariId: id },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "satın alma siparişi",
      say: () => db.satinAlmaSiparis.count({ where: { cariId: id } }),
      ornekler: () =>
        db.satinAlmaSiparis
          .findMany({
            where: { cariId: id },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "sipariş satırı",
      say: () => db.satinAlmaTalepSiparis.count({ where: { cariId: id } }),
      ornekler: () =>
        db.satinAlmaTalepSiparis
          .findMany({
            where: { cariId: id },
            take: ORNEK_LIMIT,
            select: { siparisId: true, satir: { select: { talepId: true } } },
          })
          .then((r) => tekil(r.map((x) => x.siparisId ?? x.satir.talepId))),
    },
    {
      etiket: "stok kartı tedarikçi kaydı",
      say: () => db.stokUretici.count({ where: { cariId: id } }),
      ornekler: () =>
        db.stokUretici
          .findMany({
            where: { cariId: id },
            take: ORNEK_LIMIT,
            select: { stok: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.stok.ad))),
    },
    {
      etiket: "stok kartı müşteri kaydı",
      say: () => db.stokMusteri.count({ where: { cariId: id } }),
      ornekler: () =>
        db.stokMusteri
          .findMany({
            where: { cariId: id },
            take: ORNEK_LIMIT,
            select: { stok: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.stok.ad))),
    },
    {
      etiket: "stok kartı varsayılan üreticisi",
      say: () => db.stok.count({ where: { ureticiCariId: id } }),
      ornekler: () =>
        db.stok
          .findMany({
            where: { ureticiCariId: id },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    },
  ]);
  if (!sonuc.silinebilir) return sonuc;

  if (Math.abs(Number(cari.bakiye)) > 0.005)
    return {
      silinebilir: false,
      ad: cari.ad,
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
      ornekler: () =>
        db.modelParca
          .findMany({
            where: { parcaId: id },
            take: ORNEK_LIMIT,
            select: { stok: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.stok.ad))),
    },
    {
      etiket: "başka reçetede alt parça kullanımı",
      say: () => db.receteSatiri.count({ where: { altParcaId: id } }),
      ornekler: () =>
        db.receteSatiri
          .findMany({
            where: { altParcaId: id },
            take: ORNEK_LIMIT,
            select: { parca: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.parca.ad))),
    },
    {
      etiket: "bağlı stok kartı",
      say: () => db.stok.count({ where: { receteParcaId: id } }),
      ornekler: () =>
        db.stok
          .findMany({
            where: { receteParcaId: id },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    },
    {
      etiket: "üretim emri",
      say: () =>
        db.uretimEmri.count({ where: { modelId: id, refTip: "parca" } }),
      ornekler: () =>
        db.uretimEmri
          .findMany({
            where: { modelId: id, refTip: "parca" },
            take: ORNEK_LIMIT,
            select: { id: true, durum: true },
          })
          .then((r) => r.map((x) => `${x.id} (${x.durum})`)),
    },
    {
      // Poşetin ait olduğu ürün bu parça olabilir.
      etiket: "malzeme poşeti bağlantısı",
      say: () =>
        db.poset.count({ where: { refTip: "parca", refId: id } }),
      ornekler: () =>
        db.poset
          .findMany({
            where: { refTip: "parca", refId: id },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    },
    {
      // Parça, BAŞKA bir parçanın koli dökümünde kullanılıyor olabilir.
      // Kendi paketleri engel değil — onlar cascade ile gider.
      etiket: "paket içeriği",
      say: () =>
        db.parcaPaketIcerik.count({
          where: { altParcaId: id, paket: { parcaId: { not: id } } },
        }),
      ornekler: () =>
        db.parcaPaketIcerik
          .findMany({
            where: { altParcaId: id, paket: { parcaId: { not: id } } },
            take: ORNEK_LIMIT,
            select: { paket: { select: { parcaId: true, sira: true } } },
          })
          .then((r) => r.map((x) => `${x.paket.parcaId} · Paket ${x.paket.sira}`)),
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
      ornekler: () =>
        db.stokHareket
          .findMany({
            where: { depo: ref },
            take: ORNEK_LIMIT,
            orderBy: { id: "desc" },
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "alış fişi",
      say: () => db.alis.count({ where: { depo: ref } }),
      ornekler: () =>
        db.alis
          .findMany({
            where: { depo: ref },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "üretim emri",
      say: () => db.uretimEmri.count({ where: { hedefDepo: ref } }),
      ornekler: () =>
        db.uretimEmri
          .findMany({
            where: { hedefDepo: ref },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "satın alma talebi",
      say: () => db.satinAlmaTalep.count({ where: { depo: ref } }),
      ornekler: () =>
        db.satinAlmaTalep
          .findMany({
            where: { depo: ref },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "satın alma siparişi",
      say: () => db.satinAlmaSiparis.count({ where: { depo: ref } }),
      ornekler: () =>
        db.satinAlmaSiparis
          .findMany({
            where: { depo: ref },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
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

  type StokAlan =
    "cins" | "marka" | "renk" | "stokBirimi" | "bolum" | "grup" | "model";
  const ALAN: Record<string, StokAlan> = {
    cins: "cins",
    marka: "marka",
    renk: "renk",
    birim: "stokBirimi",
    tip: "grup",
    bolum: "bolum",
    model: "model",
  };
  const kontroller: Kontrol[] = [];
  const alan = ALAN[t.tip];
  if (alan)
    kontroller.push({
      etiket: "stok kartı",
      say: () => db.stok.count({ where: { [alan]: t.ad } }),
      ornekler: () =>
        db.stok
          .findMany({
            where: { [alan]: t.ad },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    });
  if (t.tip === "cins")
    // Cins silinince ona bağlanmış renklerin bağı kırılır.
    kontroller.push({
      etiket: "renk tanımı bağlantısı",
      say: () =>
        db.tanim.count({
          where: { tip: "renk", cinsler: { contains: t.ad } },
        }),
      ornekler: () =>
        db.tanim
          .findMany({
            where: { tip: "renk", cinsler: { contains: t.ad } },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    });
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
      ornekler: () =>
        db.grup
          .findMany({
            where: { ustId: id },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    },
    {
      etiket: "stok kartı",
      say: () =>
        db.stok.count({
          where: {
            OR: [{ altGrup: g.ad }, { detayGrup: g.ad }, { kategori: g.ad }],
          },
        }),
      ornekler: () =>
        db.stok
          .findMany({
            where: {
              OR: [{ altGrup: g.ad }, { detayGrup: g.ad }, { kategori: g.ad }],
            },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
    },
  ]);
}

/** İstasyon (fabrika rotası). */
export async function istasyonSilinebilirMi(id: string): Promise<SilmeSonucu> {
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
      ornekler: () =>
        db.receteSatiri
          .findMany({
            where: { istasyon: ref },
            take: ORNEK_LIMIT,
            select: { parca: { select: { ad: true } } },
          })
          .then((r) => tekil(r.map((x) => x.parca.ad))),
    },
    {
      etiket: "üretim emri adımı",
      say: () => db.uretimEmriAdim.count({ where: { istasyon: ref } }),
      ornekler: () =>
        db.uretimEmriAdim
          .findMany({
            where: { istasyon: ref },
            take: ORNEK_LIMIT,
            select: { emirId: true },
          })
          .then((r) => tekil(r.map((x) => x.emirId))),
    },
    {
      etiket: "stok hareketi",
      say: () => db.stokHareket.count({ where: { istasyon: ref } }),
      ornekler: () =>
        db.stokHareket
          .findMany({
            where: { istasyon: ref },
            take: ORNEK_LIMIT,
            orderBy: { id: "desc" },
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "stok kartı bölümü",
      say: () => db.stok.count({ where: { bolum: ref } }),
      ornekler: () =>
        db.stok
          .findMany({
            where: { bolum: ref },
            take: ORNEK_LIMIT,
            select: { ad: true },
          })
          .then((r) => r.map((x) => x.ad)),
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
  // Poşetin kendi malzeme satırları engel değil (cascade).
  return topla(p.ad, [
    {
      // Poşet bir parçanın koli dökümüne konmuşsa silinemez: paketleme
      // personeli o poşeti bekliyor, sessizce kaybolmamalı.
      etiket: "paket içeriği",
      say: () => db.parcaPaketIcerik.count({ where: { posetId: id } }),
      ornekler: () =>
        db.parcaPaketIcerik
          .findMany({
            where: { posetId: id },
            take: ORNEK_LIMIT,
            select: { paket: { select: { parcaId: true, sira: true } } },
          })
          .then((r) => r.map((x) => `${x.paket.parcaId} · Paket ${x.paket.sira}`)),
    },
  ]);
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
      ornekler: () =>
        db.satinAlmaTalep
          .findMany({
            where: { olusturanAd: ad },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "onayladığı satın alma talebi",
      say: () => db.satinAlmaTalep.count({ where: { onaylayanAd: ad } }),
      ornekler: () =>
        db.satinAlmaTalep
          .findMany({
            where: { onaylayanAd: ad },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
    {
      etiket: "oluşturduğu sipariş",
      say: () => db.satinAlmaSiparis.count({ where: { olusturanAd: ad } }),
      ornekler: () =>
        db.satinAlmaSiparis
          .findMany({
            where: { olusturanAd: ad },
            take: ORNEK_LIMIT,
            select: { id: true },
          })
          .then((r) => r.map((x) => x.id)),
    },
  ]);
}
