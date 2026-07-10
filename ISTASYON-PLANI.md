# Dinamik İstasyon (Üretim Rotası) Planı

Amaç: Üretim istasyonlarını DB'den tanımlanır yapmak. Tek kaynak `istasyon`
tablosu; 3D fabrika, üretim emri adımları, stok düşüm motoru, reçete istasyon
seçimi ve stok kartı "Bölüm" hepsi buradan beslenir.

## Mevcut yüzey (fabrika.ts sabitleri)
- `fabrika.ts`: `IstasyonSlug` union, `ISTASYONLAR` (slug/ad/konum/renk), `ROTA`
  (sıra), `ISTASYON_MAP`, `DEPO`, `FABRIKA`, `aktifIstasyon()`.
- Tüketiciler: `stok.ts` (ROTA[0] default, IstasyonSlug), `actions.ts` (emir
  adımları ROTA.map), `fabrika-gorunum.tsx` + `fabrika-sahne.tsx` (3D: konum/renk/
  slug/ROTA/ISTASYON_MAP), `recete-detay.tsx` (istasyon picker ISTASYONLAR),
  `new-product-page.tsx` (fabrika import — kontrol edilecek).

## Hedef şema
```
model Istasyon {
  id     String  @id           // slug: kesim, bantlama...
  ad     String
  sira   Int                   // rota sırası
  renk   String  @default("#737373")
  konumX Decimal @map("konum_x") @db.Decimal(6,2)
  konumZ Decimal @map("konum_z") @db.Decimal(6,2)
  konumG Decimal @map("konum_g") @db.Decimal(6,2)
  konumD Decimal @map("konum_d") @db.Decimal(6,2)
  durum  String  @default("Aktif")
  @@map("istasyon")
}
```

## Aşamalar (her biri: tsc + sayfa 200 + commit)

### I1 — Şema + seed + queries
- `Istasyon` modeli; db push + generate (dev durdur).
- Seed: mevcut 6 istasyonu (fabrika.ts VARSAYILAN_ISTASYONLAR) idempotent oluştur.
- `getIstasyonlar(): Istasyon[]` (sira'ya göre).
- `fabrika.ts`: `IstasyonSlug = string`; `ISTASYONLAR/ROTA/ISTASYON_MAP` sabitleri
  → `VARSAYILAN_ISTASYONLAR` (yalnız seed). `Istasyon` tipi, `aktifIstasyon`, `DEPO`,
  `FABRIKA`, `EmirAdimi`, `FabrikaEmri` kalır.

### I2 — İstasyon tanımlama sayfası
- actions: `istasyonKaydet` (ad/sira/renk/konum), `istasyonSil`.
- Sayfa: liste (sıra ile) + modal form (ad, slug/kod, sıra, renk, konum x/z/g/d).
  Nav "Tanımlamalar → Üretim → İstasyonlar"; rota /stok-yonetimi?bolum=istasyonlar
  ya da ayrı /istasyonlar.

### I3 — Tüketicileri DB'ye bağla
- `stok.ts`: ilk istasyon slug'ı ve rota DB'den (fonksiyonlara geçir).
- `actions.ts`: emir adımları `getIstasyonlar` sırasından.
- `fabrika-gorunum`/`fabrika-sahne`: `istasyonlar` prop; ISTASYON_MAP/ROTA prop'tan türet.
- `recete-detay`: istasyon picker DB istasyonlarından.
- Stok kartı "Bölüm": istasyon adlarından beslenir (bolum tanımı yerine).

## Riskler
- 3D sahne konum'a çok bağlı — konum alanları şart; boş/eksik konumda güvenli varsayılan.
- IstasyonSlug union → string gevşemesi tsc rippleları.
- Motorun rota sırası DB'den; boş istasyon tablosunda seed devreye girer.
- Pull sonrası: prisma db push + generate (dev durdur).
