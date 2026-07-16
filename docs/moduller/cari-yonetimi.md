# Cari Yönetimi

**Durum:** ✅ Mevcut

## Amaç
Cari hesaplar (müşteri / tedarikçi / banka) ve satın alma süreci. Cari
işlemleri (borç/alacak/tahsilat/ödeme) bakiyeleri güncel tutar.

## Ekranlar
- Cari Hesaplar — `/cari`
- **Satın Alma Talepleri** — `/satin-alma/talepler`
- **Bekleyen Siparişler** — `/satin-alma/siparisler`
- **Satın Alma Şartları** — `/satin-alma/sartlar`
- **Satın Alma (Alış)** — `/satin-alma`

## Ana kayıtlar / durumlar
- **Cari** (`Cari`) — tip: Müşteri / Tedarikçi / Her İkisi / Banka; bakiye; işlem geçmişi (`CariIslem`).
- **Satın Alma Talebi** (`SatinAlmaTalep`) — Beklemede → Onaylandı → Tedarik Sürecinde → Tamamlandı (+ Reddedildi).
  - Satır durumu: Bekliyor → Sipariş Verildi → Kısmi → Tedarik Edildi.
- **Satın Alma Şartı** (`SatinAlmaSarti`) — firma × malzeme anlaşması (fiyat, döviz, tedarik süresi, min sipariş).
- **Bekleyen Sipariş** (`BekleyenSiparis`) — talepler arası açık siparişler, gecikme takibi.
- **Alış** (`Alis`) — mal kabul fişi (`ALS-####`); stok girişi + tedarikçiye cari Alacak.

## İlgili kod
- Tipler: `src/lib/data.ts` — `Cari`, `CariIslem`, `SatinAlmaTalep`, `TalepSiparis`, `BekleyenSiparis`, `SatinAlmaSarti`, `Alis`
- Aksiyon: `src/lib/db/actions.ts` — `talepOlustur/Onayla/Reddet/Baslat/SiparisEkle/Dagit`, `alisKaydet`, `talepOtoEslesme`
- UI: `src/components/cari/*`, `src/components/satin-alma/*`, `src/app/(panel)/cari/`, `src/app/(panel)/satin-alma/`

## Ayrıntılı akış
- Satın alma modülü aşama diyagramı: [`../satin-alma-akis.md`](../satin-alma-akis.md)

## Bağlantılar
- **Stok** → mal kabul girişi; **Üretim Planlama** → eksik malzeme talebi
