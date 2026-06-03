# PLANNING — Yol Haritası (Taslak)

> ⚠️ **Durum: PLANLAMA.** Kod yazımı henüz başlamadı.
> Bu doküman fazları ve ilerleyişi takip eder.

## Mevcut Faz: 🟡 0 — Planlama & Mimari
Hedef: kapsam, mimari ve teknoloji kararlarını netleştirmek.

### Faz 0 — Yapılacaklar
- [x] Dokümantasyon iskeleti (MEMORY + docs/)
- [ ] "Açık Sorular"ı yanıtla (bkz. `../MEMORY.md`)
- [ ] Dağıtım modeli kararı (bulut / on-premise / her ikisi)
- [ ] Multi-tenant kararı
- [ ] Teknoloji yığınını kesinleştir (Next.js + shadcn onayı, DB seçimi, ORM)
- [ ] Modül kapsamlarını ve MVP sınırını netleştir
- [ ] Veri modeli taslağı (ER diyagramı) — ana varlıklar
- [ ] Rol/yetki matrisi taslağı

## Sonraki Fazlar (taslak)

### Faz 1 — Temel İskelet
- Proje kurulumu (Next.js + shadcn + Tailwind + TS)
- Auth & RBAC iskeleti
- Veritabanı bağlantısı + ilk şema/migration
- Ortak layout, navigasyon, tema

### Faz 2 — Stok + Üretim (MVP çekirdeği) ⭐
> MVP burası: mobilya fabrikasının çekirdek operasyonu.
- Stok kartları (hammadde/yarı mamul/mamul), depo, stok hareketleri
- Ürün ağacı (BOM), iş emirleri, üretim sarfı ve girişi

### Faz 3 — Cari
- Müşteri/tedarikçi kartları, cari hareketler

### Faz 4 — Satış (+ e-Fatura hazırlığı)
- Teklif/sipariş/irsaliye/fatura akışı
- e-Fatura/e-Arşiv entegrasyonu (veri modeli baştan hazır kurulur)

### Faz 5 — Raporlama & İyileştirme
- Dashboard, raporlar, denetim izi, performans

> Fazlar ve kapsam, planlama sonunda netleşince güncellenecek.

## Çalışma Prensibi
1. Önce konuş/karar ver → `MEMORY.md`'ye yaz.
2. Sonra ilgili dokümanı güncelle.
3. Faz onayı gelince kod yazımına geç.
