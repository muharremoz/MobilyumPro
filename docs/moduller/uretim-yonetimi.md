# Üretim Yönetimi

**Durum:** ✅ Mevcut

## Amaç
Kart tanımlarından (malzeme, parça, model) üretim planına, oradan üretim
emri ve fabrika istasyon akışına kadar üretim süreci.

## Ekranlar
**Kartlar**
- Malzeme — `/stok-karti`
- Parça — `/stok-yonetimi?bolum=parcalar`
- Model — `/urunler`

**Üretim**
- Üretim Planı — `/uretim/plan`
- Üretim Takibi (emirler) — `/uretim/emirler`
- Fabrika — `/uretim/fabrika`
- Reçete — `/uretim/recete`
- Malzeme Poşeti — `/uretim/poset`

## Ana kayıtlar / durumlar
- **Model / Parça / Malzeme** — reçete (BOM) ile birbirine bağlı.
- **Üretim Planı** — model + adet → `malzemeYeterlilik` (BOM) ile stok kontrolü.
  - Eksik → **Satın Alma Talebi** (`talepOlustur`).
  - Yeterli → **Üretim Emri** (`uretimEmriOlustur`).
- **Üretim Emri** (`UretimEmri`) durumları: **Planlandı → Üretimde → Tamamlandı** (+ İptal).
- **İstasyon rotası:** kesim → bantlama → delik → montaj → paketleme → sevkiyat.
- İki tüketim modu (parametre `uretimde_hemen_dus`): üretime geçişte toplu düşüm ya da her istasyon tamamlanınca o istasyonun tüketimi.
- Paketleme bitişinde **mamul girişi** (`mamulGirisi`) → mamül stoğa girer.

## İlgili kod
- Tipler: `src/lib/data.ts` — `Model`, `Parca`, `Malzeme`, `UretimEmri`, `UretimDurum`, `ReceteSatiri`
- BOM: `src/lib/bom.ts` — `malzemeYeterlilik`, `modelMalzemeIhtiyaci`
- Stok etkisi: `src/lib/db/stok.ts` — `uretimeGecisDusumu`, `istasyonDusumu`, `mamulGirisi`
- Aksiyon: `src/lib/db/actions.ts` — `uretimEmriOlustur`, `emriIlerlet`, `emriIptalEt`
- UI: `src/components/production/*`, `src/app/(panel)/uretim/`

## Bağlantılar
- **Stok** ← −Malzeme (üretim) / +Mamül (paketleme); rezerve
- **Satın Alma** ← eksik malzeme talebi
