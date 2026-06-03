# MODULES — Modül Kapsamları (Taslak)

> ⚠️ **Durum: PLANLAMA.** Aşağıdaki kapsamlar tartışılacak ve önceliklendirilecek.
> Onay verilen kapsamlar `../MEMORY.md` karar kaydına işlenir.

Mobilya fabrikası için temel modüller ve olası kapsamlar. Bunlar birer
**konuşma başlangıcı**; eksik/fazlasını birlikte netleştireceğiz.

## 1. 📦 Stok (Inventory)
- Ürün/malzeme kartları (hammadde, yarı mamul, mamul)
- Birim yönetimi (adet, m², m³, kg, metretül...)
- Depo / lokasyon yönetimi (çok depolu)
- Stok giriş/çıkış hareketleri, sayım, transfer
- Asgari/kritik stok uyarıları
- Barkod / parti / seri takibi (opsiyonel)
- **Açık:** Mobilyada plaka/m² hesabı, fire/zayiat takibi gerekiyor mu?

## 2. 🏭 Üretim (Production)
- Ürün ağacı / reçete (BOM — Bill of Materials)
- İş emirleri (work orders)
- Üretim aşamaları/istasyonları (kesim, bantlama, montaj, boya...)
- Hammadde rezervasyonu ve sarf (stok ile entegre)
- İş emri maliyetlendirme
- Kapasite/planlama (ileri faz)
- **Açık:** Siparişe mi üretim (MTO), stoğa mı (MTS)? İstasyon bazlı takip şart mı?

## 3. 👥 Cari (Contacts / Accounts)
- Müşteri ve tedarikçi kartları
- Cari hesap hareketleri (borç/alacak)
- Cari ekstre, bakiye, yaşlandırma
- İletişim/adres/yetkili bilgileri
- Risk limiti, vade takibi
- **Açık:** Muhasebe/e-Fatura entegrasyonu beklentisi?

## 4. 🛒 Satış (Sales)
- Teklif → Sipariş → İrsaliye → Fatura akışı
- Fiyat listeleri, iskonto, KDV
- Sipariş durumu takibi (üretim ile bağlantılı)
- Sevkiyat/teslimat
- Satış raporları
- **Açık:** Satın alma (purchasing) ayrı modül olacak mı?

## 5. 🔐 Sistem / Ortak (Core)
- Kullanıcı, rol ve yetki yönetimi (RBAC)
- Şirket/şube ayarları
- Denetim izi (audit log)
- Raporlama & dashboard
- Bildirimler

## Önceliklendirme (KARAR)
**MVP = Stok + Üretim** ⭐ (mobilya fabrikasının çekirdek operasyonu).
Sonra: **Cari → Satış**. Satış modülü **e-Fatura** entegrasyonunu da kapsayacak
(veri modeli baştan e-Fatura'ya hazır kuruluyor — bkz. `DATA-MODEL.md`).
