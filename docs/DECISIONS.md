# DECISIONS — Mimari Karar Kayıtları (ADR)

> Önemli ve geri dönüşü maliyetli kararlar burada **ADR** formatında tutulur.
> Küçük/günlük kararlar `../MEMORY.md` karar kaydında kalır.
>
> Format:
> ```
> ## ADR-000X: Başlık
> - Tarih:
> - Durum: Öneri | Kabul | Reddedildi | Değişti
> - Bağlam: neden bu karara ihtiyaç var
> - Karar: ne kararlaştırıldı
> - Sonuçlar: artıları/eksileri, etkileri
> ```

---

## ADR-0001: Frontend olarak Next.js + shadcn/ui
- Tarih: 2026-06-03
- Durum: 🟡 Öneri (onay bekliyor)
- Bağlam: Modern, modüler, SSR destekli ve hızlı geliştirilebilir bir web arayüzü gerekiyor.
- Karar: Next.js (App Router) + TypeScript, UI için shadcn/ui + Tailwind CSS.
- Sonuçlar: Geniş ekosistem, erişilebilir bileşenler, tema desteği. Karar kesinleşince bu ADR "Kabul" olur.

## ADR-0002: Dağıtım modeli ve veritabanı
- Tarih: 2026-06-03
- Durum: ✅ Kabul (önceki "bulut öncelikli" kararın yerini aldı)
- Bağlam: Hedef sektör (mobilya/üretim KOBİ) verisinin fabrika dışında (bulutta) tutulmasını istemiyor. Ürün birçok fabrikaya satılacak ama her fabrika kendi içinde çalışmak istiyor.
- Karar: **Saf on-premise.** Uygulama her fabrikanın kendi sunucusuna kurulur; internetsiz çalışır. **Veritabanı: PostgreSQL** (Prisma ORM ile soyutlanır; ileride SQL Server talebi için kapı açık).
- Sonuçlar: Veri tamamen müşteride → güven. Vercel/Supabase Cloud kullanılmaz. Maliyet: çok sahaya kurulum + güncelleme + destek yükü satıcıda. Bu yüzden paketleme/güncelleme/lisanslama stratejisi baştan planlanmalı (bkz. ADR-0005).

## ADR-0003: Tenant modeli
- Tarih: 2026-06-03
- Durum: ✅ Kabul (önceki "paylaşımlı DB + RLS" kararın yerini aldı)
- Bağlam: On-premise olduğundan her kurulum tek bir fabrikaya ait.
- Karar: **Her kurulum single-tenant.** Paylaşımlı-DB/RLS çoklu-kiracılık **gerekmez**. Yine de veri modelinde `company_id` korunur; çünkü bir fabrikanın birden çok **şubesi/legal şirketi** olabilir.
- Sonuçlar: Daha basit mimari, daha az güvenlik riski. İş modeli "çok satış" ama teknik olarak her satış ayrı kurulum.

## ADR-0004: Kimlik doğrulama (Auth)
- Tarih: 2026-06-03
- Durum: ✅ Kabul (Supabase Auth yerine)
- Bağlam: On-premise, internetsiz çalışabilmeli; bulut auth servisine bağımlı olunamaz.
- Karar: **NextAuth / Auth.js** — uygulamanın içinde, local kimlik doğrulama (e-posta/kullanıcı adı + şifre). Roller DB'de tutulur (RBAC).
- Sonuçlar: Tam offline çalışır. SSO/LDAP ileride eklenebilir (bazı fabrikaların domain'i olabilir).

## ADR-0005: Hedef ortam, paketleme ve güncelleme
- Tarih: 2026-06-03
- Durum: ✅ Kabul (paketleme detayı 🟡 öneri)
- Bağlam: Ürün çok sayıda fabrikanın sunucusuna kurulacak; sürüm güncellemeleri gerekiyor.
- Karar: **Hedef ortam Windows Server** (her fabrikada gerçek sunucu var). **Güncellemeler internet üzerinden** merkezi sunucudan dağıtılır. Paketleme için öneri: **Docker Compose** (app + PostgreSQL + reverse proxy tek pakette); Windows Server Docker'ı destekler, güncelleme = yeni imaj çekme. Alternatif: native Windows installer (Node servisi + PostgreSQL). Kesin paketleme kararı ilk kurulum prototipinde verilecek.
- Sonuçlar: Tekrarlanabilir kurulum, kolay güncelleme. Docker, Windows IT için ek bilgi isteyebilir → kurulum sihirbazı/script ile sarmalanmalı.

## ADR-0006: Merkezi Lisans & Güncelleme Sunucusu (satıcı tarafı)
- Tarih: 2026-06-03
- Durum: ✅ Kabul
- Bağlam: Modül bazlı lisanslama ve internetten güncelleme gerekiyor.
- Karar: Satıcı tarafında ayrı bir **merkezi sunucu** olacak: müşteri/lisans/modül yetkilendirme yönetimi + sürüm dağıtımı. Müşterinin iş verisini TUTMAZ (sadece lisans/sürüm meta verisi) → **bulutta barınabilir**.
  - Lisans, **imzalı token** (örn. private key ile imzalı; on-premise app public key ile doğrular) olarak verilir. İçinde: müşteri kimliği, **açık modüller**, geçerlilik süresi, (ops.) kullanıcı limiti.
  - **Offline-grace:** İnternet kesikken lisans bir süre geçerli kalır; üretim asla durmaz. İnternet varken arka planda yenilenir.
- Sonuçlar: Kopya koruması + modül satışı mümkün. İki deployable yönetilecek (on-premise app + merkezi sunucu). Güvenlik: imzalama anahtarları korunmalı.

## ADR-0007: Modular monolith + lisansla açılan modüller
- Tarih: 2026-06-03
- Durum: ✅ Kabul
- Bağlam: Modül bazlı lisanslama; on-premise kolay dağıtım gerek.
- Karar: Tek bir Next.js uygulaması (**modular monolith**); modüller (Stok/Üretim/Cari/Satış) içeride net sınırlarla ayrılır ve **lisanstaki yetkiye göre açılır/kapanır** (feature gating). Mikroservis YOK (on-premise'te dağıtımı zorlaştırır).
- Sonuçlar: Tek kurulum, basit operasyon. Modül sınırları kod düzeyinde korunmalı (modules/ klasörü). Yeni modül = yeni lisans kalemi.
