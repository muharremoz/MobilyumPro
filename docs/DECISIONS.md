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
- Durum: 🔴 AÇIK (karar verilmedi)
- Bağlam: Hem Supabase+Vercel (bulut) hem SQL Server (fabrika-içi) ihtimali var.
- Karar: —
- Sonuçlar: Eğer her iki ortam hedeflenirse veri erişimi ORM (Prisma) ile soyutlanmalı, DB'ye özgü özelliklerden kaçınılmalı. Tüm mimariyi etkiler.

## ADR-0003: Multi-tenant (çok şirketli) mimari
- Tarih: 2026-06-03
- Durum: 🔴 AÇIK
- Bağlam: Tek fabrika mı, satılabilir SaaS mı belirsiz.
- Karar: —
- Sonuçlar: SaaS ise veri modeline `company_id` ve tenant izolasyonu baştan eklenmeli.
