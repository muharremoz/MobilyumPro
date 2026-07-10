# Malzeme + Model → Stok Birleşme Planı

Amaç: `malzeme` ve `model` fiziksel tablolarını kaldırıp **`stok`** tablosunu tüm
stok kalemlerinin (Hammadde / Yarı Mamül / Mamül / Hizmet) tek fiziksel kaynağı
yapmak. Kullanıcı kararı: **ikisi de** (tam birleşme).

## Temel içgörü (migration'ı kolaylaştıran)
- Ayna id'leri **birebir aynı**: `malzeme.id == stok.id`, `model.id == stok.id`.
- Dolayısıyla `StokHareket.refId`, `ReceteSatiri.malzemeId`, `ModelParca.modelId`,
  `UretimEmri.modelId`, `AlisSatiri.malzemeId` **zaten stok id'sine eşit** → kolon
  yeniden adlandırma opsiyonel; FK'yi Malzeme/Model'den kaldırıp Stok'a bağlamak yeter.
- **Domain tipleri (`Malzeme`, `Model` in data.ts) KALIR**; sadece fiziksel tablolar
  gider. `getMalzemeler`/`getModeller` bunları `stok` satırlarından türetir → UI churn minimum.

## Hedef şema değişiklikleri (Stok)
Eklenecek kolonlar:
- `stokMiktar Decimal @default(0)` — eldeki miktar özeti (ledger yetkili). `malzeme.stok`/`model.stok` yerine.
- `varyantlarJson String? @db.NVarChar(Max)` — mamul renk/kumaş varyantları (model'den).
- `gorsel String? @db.NVarChar(Max)` — ana görsel (model'den).
- `gorsellerJson String? @db.NVarChar(Max)` — galeri (model'den).

Kaldırılacak modeller: `Malzeme`, `Model`.

FK repoint (Malzeme/Model → Stok; id'ler aynı olduğu için data taşıması yok):
- `ReceteSatiri.malzemeId` → Stok'a relation (kolon adı korunabilir: reçete bileşeni = hammadde/yarı mamül stok).
- `ModelParca.modelId` → Stok'a relation (mamul BOM).
- `UretimEmri.modelId` → Stok'a relation.
- `AlisSatiri.malzemeId` → Stok (string; relation opsiyonel).
- `StokHareket.refTip`: ileriye dönük "stok" standardı; refId zaten stok.id. UI'da
  "Malzeme/Model" ayrımı artık `stok.grup`'tan türetilir.

## Aşamalar (her aşama: tsc EXIT=0 + Invoke-WebRequest 200 + smoke + commit)

### A1 — Şema: yeni kolonlar (kırıcı değil)
- Stok'a stokMiktar/varyantlarJson/gorsel/gorsellerJson ekle.
- `prisma db push` (dev kapalıyken) + generate.
- Backfill script: `malzeme.stok → stok.stokMiktar` (Hammadde/Yarı Mamül),
  `model.stok → stok.stokMiktar` (Mamül), `model.varyantlar/gorsel/gorseller → stok`.

### A2 — DB okuma katmanı stok'a çevrilir (queries.ts)
- `stokMiktarlari()` → `stok.stokMiktar`'dan oku.
- `getMalzemeler()` → `stok` (grup ∈ {Hammadde, Yarı Mamül}) satırlarından `Malzeme[]` türet.
- `getModeller()` → `stok` (grup = Mamül) + `ModelParca` (repoint sonrası stokId) → `Model[]`.
- `stokKartlariniTamamla()` → artık gereksiz (kaynak zaten stok); kaldır/no-op.
- `getTanimlar` içindeki `db.model`/`db.malzeme` okumaları stok'a çevrilir.
- `getDashboardOzet` `db.model` → stok (Mamül).

### A3 — Motor stok'a çevrilir (stok.ts)
- `dusumYaz`: `db.malzeme.findMany`/`update decrement` → `stok.findMany`/`stok.stokMiktar decrement`.
- `mamulGirisi`: `model.update increment` → `stok.stokMiktar increment`.
- `stokOzetleri`: `malzeme.findMany` → `stok` (grup ∈ hammadde/yarı mamül).
- `refTip` yazımları "stok"; filtreler `refTip:"stok"`.
- `parcaSatirlariniYukle`/`parcayiPatlat`: `receteSatiri.malzemeId` (stok id) korunur.

### A4 — Yazma katmanı sadeleşir (actions.ts)
- `stokKaydet`: ayna (malzeme/model upsert) **kaldırılır**; sadece `stok` upsert.
  Mamul alanları (varyantlar/gorsel/gorseller/fiyat) doğrudan stok kolonlarına.
- `stokSil`: ayna deleteMany kaldırılır; sadece stok.delete.
- `malzemeKaydet`/`modelKaydet`: stok.upsert'e yönlendirilir (grup set ederek) VEYA
  çağrı yerleri stokKaydet'e taşınır. `modelKaydet` BOM (ModelParca) yazımı korunur (stokId).
- `alisKaydet`: `malzeme.update increment` → `stok.stokMiktar increment`; refTip "stok".
- `refTip` "stok".

### A5 — UI repoint (tip aynı kaldığı için minimal)
- Ürünler modülü: `getModeller`/`modelKaydet` stok tabanlı → değişiklik çoğunlukla şeffaf.
  varyant/görsel alanları stok kolonlarından okunur/yazılır.
- Reçete satır picker (`recete-detay`): malzeme listesi `getMalzemeler` (stok) → şeffaf.
- Satın alma (`alis-form`): malzeme listesi `getMalzemeler` (stok) → şeffaf.
- `stock-movements`/`stock-tracker`: refTip yerine grup'tan tür türet.
- **Malzemeler sayfası + menüsü kaldırılır** (materials.tsx / nav) — giriş noktası stok kartı.

### A6 — Fiziksel tablolar düşürülür
- schema'dan `model Malzeme` ve `model Model` silinir; relation'lar Stok'a bağlanır.
- `prisma db push --accept-data-loss` (dev kapalı) + generate.
- seed.ts: `malzeme.deleteMany`/`model.deleteMany` kaldırılır.

### A7 — Doğrulama + hafıza
- tsc, sayfa 200'leri, üretim akışı smoke (emir → düşüm → mamul giriş), satın alma smoke.
- Hafıza güncelle (mobilyumpro-database.md).

## Riskler / dikkat
- Üretim düşüm/rezerv motoru en hassas kısım (A3) — düşüm/mamul-giriş smoke testi şart.
- `ModelParca` (çok satırlı mamul BOM) ile Stok.receteParcaId (tek) tutarsızlığı korunur (ayrı faz).
- Evdeki PC pull sonrası: `prisma db push --accept-data-loss` + generate (dev önce durdur).
- Ara aşamalarda malzeme/model tabloları hâlâ dururken kod stok'a bakacağı için A1-A5
  boyunca iki kaynak paralel; A6'da tablolar düşünce tek kaynak kalır.
