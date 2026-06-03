# ARCHITECTURE — Mimari (Taslak)

> ⚠️ **Durum: PLANLAMA / TASLAK.** Buradaki seçimler henüz kesinleşmedi.
> Kesinleşen kararlar `../MEMORY.md` ve `DECISIONS.md`'ye işlenir.

## 1. Hedef ve Kısıtlar
Mobilya fabrikası iş süreçlerini (stok, üretim, cari, satış) tek bir web
uygulamasında yönetmek. Hem **bulut** hem **fabrika-içi (on-premise)** kurulum
ihtimali var; bu nedenle veri katmanı taşınabilir tasarlanmalı.

## 2. Teknoloji Yığını (Öneri)

| Katman | Öneri | Not |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | SSR/RSC, modüler yapı |
| UI | **shadcn/ui + Tailwind CSS** | Erişilebilir, tema desteği |
| Form & Doğrulama | React Hook Form + **Zod** | Tip güvenli formlar |
| Veri çekme | Server Actions / TanStack Query | Duruma göre |
| Veritabanı (bulut) | **Supabase (PostgreSQL)** | Auth + RLS + Storage hazır |
| Veritabanı (lokal) | **SQL Server** | Fabrika-içi kurulum senaryosu |
| ORM | **Prisma** veya **Drizzle** | Çoklu DB için soyutlama katmanı |
| Auth | Supabase Auth / NextAuth | Dağıtım modeline bağlı |
| Dağıtım (bulut) | **Vercel** | CI/CD kolaylığı |
| Dağıtım (lokal) | Docker / Node sunucu | On-premise |

## 3. Çoklu-Veritabanı Stratejisi (Kritik Karar)
Aynı kod tabanının hem Postgres (Supabase) hem SQL Server üzerinde çalışması
isteniyorsa, **veri erişimi mutlaka bir ORM/soyutlama katmanı** arkasına alınmalı:
- **Prisma** her iki veritabanını da destekler → tek şema, iki provider.
- DB'ye özgü özelliklerden (Postgres RLS, SQL Server T-SQL) kaçınılmalı veya
  koşullu ele alınmalı.
- Auth katmanı Supabase Auth'a bağlanırsa lokal senaryoda alternatif gerekir
  (NextAuth + DB tablosu). Bu yüzden **auth soyutlaması** önemli.

> 🔑 Bu karar netleşmeden DB'ye özgü kod yazılmamalı.

## 4. Önerilen Klasör/Modül Yapısı (Taslak)
```
app/
  (auth)/            # giriş, oturum
  (dashboard)/
    stok/
    uretim/
    cari/
    satis/
  api/
modules/             # iş mantığı (domain) — UI'dan bağımsız
  inventory/
  production/
  contacts/
  sales/
lib/                 # db, auth, utils
components/ui/       # shadcn bileşenleri
prisma/              # şema & migration
docs/
```

## 5. Yatay (cross-cutting) Konular
- **Yetkilendirme (RBAC):** rol bazlı erişim — modül ve aksiyon düzeyinde.
- **Denetim izi (audit log):** kim, ne zaman, ne değiştirdi.
- **Çoklu şirket/şube** (multi-tenant) ihtimaline göre veri modeli `company_id` taşımalı.
- **Raporlama:** stok durumu, üretim takibi, cari ekstre, satış analizleri.
- **Yedekleme & veri göçü:** özellikle on-premise senaryoda.

## 6. Açık Mimari Soruları
Bkz. `../MEMORY.md` → "Açık Sorular". Özellikle dağıtım modeli ve multi-tenant
kararı tüm mimariyi etkiler.
