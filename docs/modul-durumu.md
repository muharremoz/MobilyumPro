# Modül Durumu — Denetim

_Son güncelleme: 2026-07-20. Ölçüt: sayfa gerçek DB sorgusu okuyor mu + yaz/sil
action'ı var mı. Bulgular koddan doğrulandı (51 sorgu, 100 mutasyon action'ı)._

## ✅ Tam çalışır (gerçek sorgu + CRUD + iş mantığı)

| Modül | Kanıt |
|---|---|
| **Stok** (kart / durum / hareket / depo) | Ledger tabanlı; `stokKaydet/Sil/Duzelt` + `stok_hareket` yazımı |
| **Üretim** (plan / emir / takip / reçete / poşet) | `uretimEmriOlustur`, `emriIlerlet` → stok düşümü + adım güncelleme |
| **Fabrika** (canlı hat görünümü) | Dekoratif değil: `emriIlerlet` çağırıyor, `IlerletDialog` bağlı |
| **Sayım** | `sayimOlustur / SatirKaydet / Tamamla` → tamamlanınca stok düzeltmesi yazar |
| **Sipariş + Müşteri** | `siparisOlustur`, gerçek okuma |
| **Cari** (hesap / işlem / banka / şube / CRM / doküman) | En zengin CRUD; bakiye hesabı |
| **Satın Alma** (talep / sipariş / alış / şart) | `talepOnayla/Reddet/Baslat`, `alisKaydet` → cari + stok etkisi |
| **Tanımlamalar** (istasyon / makine / grup / marka / renk / kumaş / birim / koleksiyon) | Her biri `Kaydet/Sil` + silme kontrolü |
| **Kullanıcılar & Roller & Yetki** | `rolYetkiKaydet`, `yetkiSetiUygula`, izin matrisi |
| **Döviz Kurları** | `kurlariGuncelle` (TCMB çekimi) |
| **Sistem Parametreleri** | 22 parametrenin tamamı işlevsel (2026-07-20'de bağlandı) |
| **Yazılım Güncelleme / Bağlantı Bilgileri** | Gerçek servis action'ları |

## 📖 Salt okunur (bilinçli tasarım, iskelet değil)

- **QR atölye görünümü** (`/q/[kod]`) — ustaya ölçü/parça bilgisi gösterir;
  adım ilerletme kasıtlı olarak panelde/fabrikada, QR'da değil.
- **Alış detayı** (`/satin-alma/[id]`) — v1'de alış düzenleme/silme yok.

## ❌ Hiç yok (MVP'de konuşulmuş, yapılmamış)

Ne nav'da ne kodda: **Sevkiyat, S.S.H., Maliyet, Verimlilik, Raporlama.**
(Maliyet, ayrı modül değil ama reçete patlatmasında hesaplanıyor.)

## Yapılan temizlik (2026-07-20)

- **Ayarlar → Genel** (`/ayarlar`) "(Demo)" mağaza bilgileri ekranı kaldırıldı;
  işlevsel karşılığı zaten Sistem Parametreleri. Sayfa oraya yönlendiriyor.
- **5 hayalet yetki modülü** (`maliyet, raporlama, sevkiyat, ssh, verimlilik`)
  `rol_yetki` (15 satır) ve `kullanici_yetki` (1 satır) tablolarından silindi;
  snapshot da tazelendi. Bunlar eski bir MODULLER listesinden seed edilmişti,
  kodun hiçbir yerinde yetki olarak kullanılmıyordu. (Not: "sevkiyat" ayrıca
  bir fabrika istasyonu slug'ı — o ayrı ve kalıyor.)
