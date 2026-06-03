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

## ADR-0002: Veritabanı ve dağıtım modeli
- Tarih: 2026-06-03
- Durum: ✅ Kabul
- Bağlam: Ürün bir SaaS (birden çok fabrikaya satılacak). Bulut (Supabase+Vercel) ve on-premise (SQL Server) seçenekleri vardı.
- Karar: **Bulut öncelikli — Supabase (PostgreSQL) + Vercel.** On-premise SQL Server birincil hedef değil; ileride özel kurulum talebi olan müşteriler için açık kapı. Bu nedenle veri erişimi yine de **Prisma** ile soyutlanır ve DB'ye özgü kestirmelerden kaçınılır.
- Sonuçlar: Tek kod tabanı, merkezi güncelleme, hızlı müşteri ekleme. RLS ve hazır Auth/Storage kazanımı. Risk: on-premise gerekirse Auth katmanı için alternatif (NextAuth) gerekebilir → soyutlama önemli.

## ADR-0003: Multi-tenant (çok kiracılı) mimari
- Tarih: 2026-06-03
- Durum: ✅ Kabul
- Bağlam: Ürün birden çok fabrikaya satılacak SaaS.
- Karar: **Paylaşımlı veritabanı + `company_id` (tenant) kolonu + PostgreSQL RLS** ile tenant izolasyonu. Her tablo bir tenant'a bağlı; kullanıcılar yalnızca kendi şirketinin verisini görür.
- Sonuçlar: Maliyet-etkin, ölçeklenebilir standart SaaS deseni. RLS politikaları baştan doğru kurulmalı (güvenlik kritik). Platform süper-admin rolü ayrı ele alınmalı.

## ADR-0004: Kimlik doğrulama (Auth)
- Tarih: 2026-06-03
- Durum: 🟡 Öneri (bulut kararına bağlı, güçlü aday)
- Bağlam: Multi-tenant SaaS, Supabase tabanlı.
- Karar: **Supabase Auth** — RLS ile doğal entegrasyon, e-posta/şifre + ileride SSO.
- Sonuçlar: Hızlı kurulum. On-premise senaryosunda alternatif gerekebilir.
