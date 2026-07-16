# Sipariş Yönetimi

**Durum:** ✅ Mevcut

## Amaç
Müşteri siparişleri ve müşteri kayıtları. Sipariş, üretim planına
(müşteri için üretim) ve ileride SSH'a (garanti başlangıcı) kaynak olur.

## Ekranlar
- Siparişler — `/siparisler`
- Müşteriler — `/musteriler`

## Ana kayıtlar / durumlar
- **Sipariş** (`Siparis`) — durum: Beklemede → Hazırlanıyor → Kargoda → Teslim Edildi (+ İptal).
- **Müşteri** (`Musteri`) — sipariş sayısı, toplam harcama.

## İlgili kod
- Tipler: `src/lib/data.ts` — `Siparis`, `SiparisDurum`, `Musteri`
- Sorgu/aksiyon: `src/lib/db/queries.ts`, `src/lib/db/actions.ts`
- UI: `src/components/orders/*`, `src/app/(panel)/siparisler/`, `src/app/(panel)/musteriler/`

## Bağlantılar
- **Üretim Planlama** ← müşteri için üretim (üretim emri hedef müşterisi)
- **SSH (planlanan)** → teslim edilen sipariş = garanti başlangıcı
