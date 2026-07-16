# Stok Yönetimi

**Durum:** ✅ Mevcut

## Amaç
Malzeme ve mamül stoklarının tek defterde takibi. Tüm modüllerin (üretim,
satın alma, sipariş) ortak omurgası — stok girişleri/çıkışları burada birikir.

## Ekranlar
- Stok Durumu — `/stok-yonetimi?bolum=durum`
- Stok Takip — `/stok-yonetimi?bolum=takip`
- Stok Hareketleri — `/stok-yonetimi?bolum=hareketler`
- Depolar — `/stok-yonetimi?bolum=depolar`
- Sayım — `/stok-yonetimi?bolum=sayim`

## Ana kayıtlar / kavramlar
- **Stok kartı** (`Stok`) — `stokMiktar` = eldeki miktar; grup: Hammadde / Yarı Mamül / Mamül / Hizmet.
- **Stok hareketi** (`StokHareket`) — tür: **Giriş · Çıkış · Transfer**; ref: malzeme/model; depo; opsiyonel istasyon + emir bağı.
- **Rezerve** — açık üretim emirlerinin (Planlandı + Üretimde) henüz düşülmemiş ihtiyacı.
- **Kullanılabilir** = eldeki − rezerve → üretim planına bu miktar okutulur.
- Depolar arası **transfer**; dönemsel **sayım**.

## İlgili kod
- Tipler: `src/lib/data.ts` — `StokHareket`, `StokHareketTuru`, `StokGrup`, `Depo`
- Hesap: `src/lib/db/stok.ts` — `stokOzetleri` (eldeki/rezerve/kullanılabilir), düşüm/giriş yardımcıları
- Sorgu/aksiyon: `src/lib/db/queries.ts`, `src/lib/db/actions.ts`
- UI: `src/components/inventory/*`, `src/app/(panel)/stok-yonetimi/`

## Bağlantılar
- **Satın Alma** mal kabulü → +Malzeme (Giriş)
- **Üretim** emri → −Malzeme (Çıkış) · paketleme → +Mamül (Giriş)
- **Üretim Planlama** BOM → kullanılabilir miktarı okur
