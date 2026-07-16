# Tanımlamalar

**Durum:** ✅ Mevcut

## Amaç
Diğer modüllerin kullandığı temel tanım/sözlük kayıtları. Genelde basit
liste (ad + ilişkiler) yönetimi.

## Ekranlar
**Üretim**
- İstasyonlar — `/stok-yonetimi?bolum=istasyonlar`

**Model**
- Gruplar — `/stok-yonetimi?bolum=gruplar`
- Markalar — `/stok-yonetimi?bolum=markalar`
- Koleksiyonlar — `/stok-yonetimi?bolum=koleksiyonlar`

**Özellik**
- Renkler — `/stok-yonetimi?bolum=renkler`
- Kumaşlar — `/stok-yonetimi?bolum=kumaslar`
- Birimler — `/stok-yonetimi?bolum=birimler`

## Ana kayıtlar
- **İstasyon** (`Istasyon`) — fabrika rota adımları (kesim, montaj, …).
- **Grup / Marka / Koleksiyon** — model sınıflandırması.
- **Renk / Kumaş / Birim** — malzeme/model özellikleri; `Tanim` tablosu (tip + ad).

## İlgili kod
- Tipler: `src/lib/data.ts` — `TanimTip`, `TanimKalemi`, `Istasyon`, `Kategori`
- Fabrika sabitleri: `src/lib/fabrika.ts` — `ISTASYONLAR`
- UI: `src/components/definitions/*`, `src/app/(panel)/tanimlamalar/`

## Bağlantılar
- Üretim (istasyon rotası), Model/Malzeme kartları (grup/marka/renk/kumaş/birim)
