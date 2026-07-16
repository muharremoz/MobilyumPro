# SSH — Satış Sonrası Hizmet

**Durum:** 🔜 Planlandı (henüz başlanmadı)

## Amaç
Ürün teslim edildikten *sonra* devreye giren servis süreci: garanti takibi,
arıza/servis talebi, teknisyen/yetkili servis ataması, yedek parça ile
onarım/değişim ve müşteri memnuniyeti. Türkiye'de **Satış Sonrası Hizmetler
Yönetmeliği** kapsamında mobilya için asgari servis süresi, yedek parça temin
zorunluluğu ve yetkili servis şartı vardır.

## Kapsam
- Garanti başlangıç/bitiş takibi (teslim tarihinden).
- Servis talebi (çağrı) açma ve takibi.
- Teknisyen / yetkili servis ataması (yerinde servis ya da ürünü geri alma).
- Yedek parça talebi ve değişimi (stok/üretimden).
- Onarım / değişim / iade kararı; garanti içi–dışı ayrımı ve ücretlendirme.
- Şikâyet ve memnuniyet kaydı.

## Önerilen durum makinesi (servis talebi)
`Açıldı → Atandı → Serviste → Parça Bekliyor → Tamamlandı`
(+ yan durumlar: **İptal**, **İade/Değişim**; etiket: **Garanti içi / Garanti dışı**)

## Ekranlar (öneri)
- Servis Talepleri (liste + durum panosu) — `/ssh` veya `/servis`
- Servis Talebi detayı (modal) — garanti durumu, atanan teknisyen, parça satırları, işlem geçmişi
- (Ops.) Yetkili Servis / Teknisyen tanımları — Tanımlamalar altında

## Mevcut modüllerle bağlantılar
| Bağlantı | İçerik |
|----------|--------|
| **Sipariş / Müşteri** | Hangi müşteri, hangi ürün, teslim tarihi → **garanti başlangıcı** |
| **Stok** | Yedek parça çıkışı (değişen parça); gerekiyorsa parça temini |
| **Üretim** | Parça stokta yoksa iç üretim/temin (parça emri) |
| **Cari** | Garanti dışı servis/parça ücreti → müşteriye borç/fatura |
| **Kullanıcılar & Roller** | SSH sorumlusu / servis departmanı yetkisi |

## Veri modeli taslağı (öneri)
- `ServisTalep` — id (SRV-####), musteriId, siparisId?, urunId, tarih, durum, garanti (içi/dışı), aciklama, atananId?, kapanisTarihi?
- `ServisTalepSatiri` — talepId, malzemeId (yedek parça), miktar, ucret?, tip (parça/işçilik)
- (Ops.) `Teknisyen` / `YetkiliServis` — Tanımlamalar

## Notlar
- Aynı tasarım diliyle kurulacak: standart liste kartı + durum rozetleri +
  detay modalı (mevcut Satın Alma Talepleri modülüyle birebir yaklaşım).
- Rol/departman kontrolü SSH için de geçerli (oturum altyapısı gelince gerçek
  kimliğe bağlanacak).

> Bu dosya bir taslaktır; geliştirmeye başlanınca güncellenip
> `docs/moduller/` altına taşınacaktır.
