# Sevkiyat / Lojistik

**Durum:** 🔜 Planlandı (henüz başlanmadı)

## Amaç
Üretimi/paketlemesi biten mamülün depodan müşteriye teslimine kadar olan
dış lojistik süreci: sevkiyat emri, araç/nakliye firması, rota ve teslim
planı, sevk irsaliyesi, paket/palet takibi ve teslim durumu.

> Üretim rotasındaki **sevkiyat** istasyonu (kesim → … → paketleme → sevkiyat)
> bu modülün fabrika içi çıkış noktasıdır; modül oradan müşteriye teslimi
> yönetir.

## Kapsam
- Siparişten (ya da hazır stoktan) **sevkiyat emri** oluşturma.
- **Araç / nakliye firması** ataması — kendi filo veya 3. parti taşıyıcı.
- **Rota / teslim planı** — teslim tarihi, adres, sıralama.
- **Sevk irsaliyesi** ve paket/palet/koli takibi.
- **Teslim durumu** takibi ve teslim onayı (POD — teslim alan, imza/tarih).
- Kısmi teslim / iade yönetimi.

## Önerilen durum makinesi (sevkiyat emri)
`Hazırlanıyor → Yüklendi → Yolda → Teslim Edildi`
(+ yan durumlar: **İptal**, **Kısmi Teslim**, **İade**)

## Ekranlar (öneri)
- Sevkiyatlar (liste + durum panosu) — `/sevkiyat`
- Sevkiyat detayı (modal) — kalemler, araç/taşıyıcı, teslim bilgisi, irsaliye
- (Ops.) Araç / Nakliye Firması tanımları — Tanımlamalar altında

## Mevcut modüllerle bağlantılar
| Bağlantı | İçerik |
|----------|--------|
| **Sipariş / Müşteri** | Sipariş → sevkiyat; teslim adresi müşteriden |
| **Stok** | Mamül **çıkışı** (depo → sevk); depolar arası transfer |
| **Üretim** | Sevkiyat istasyonu = fabrika çıkış noktası |
| **Cari** | Nakliye gideri → taşıyıcıya borç (3. parti ise) |
| **SSH (planlanan)** | **Teslim = garanti başlangıcı** — SSH'a kaynak olur |

## Veri modeli taslağı (öneri)
- `SevkiyatEmri` — id (SVK-####), siparisId?, musteriId, tarih, durum, adres, aracId?/tasiyici?, teslimTarihi?, teslimAlan?
- `SevkiyatSatiri` — sevkiyatId, urunId (mamül), miktar, paket/koli bilgisi
- (Ops.) `Arac` / `NakliyeFirmasi` — Tanımlamalar

## Notlar
- Aynı tasarım diliyle kurulacak: standart liste kartı + durum rozetleri +
  detay modalı (Satın Alma / SSH ile birebir yaklaşım).
- Teslim onayı SSH modülünün garanti başlangıcını tetikler.

> Bu dosya bir taslaktır; geliştirmeye başlanınca güncellenip
> `docs/moduller/` altına taşınacaktır.
