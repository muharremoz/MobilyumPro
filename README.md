# MobilyumPro

Mobilya fabrikaları için modüler iş yönetim / ERP web uygulaması.
**Modüller:** Stok · Üretim · Cari · Satış

> 🟡 **Durum: Planlama aşaması.** Henüz kod yazılmıyor; önce mimari ve
> özellikler netleştiriliyor.

## Teknoloji Yönü
- **Frontend:** Next.js (App Router) + TypeScript + shadcn/ui + Tailwind
- **Dağıtım:** Saf **on-premise** — her fabrikanın kendi sunucusunda, internetsiz çalışır
- **Veritabanı:** PostgreSQL (Prisma ORM; ileride SQL Server kapısı açık)
- **Auth:** NextAuth/Auth.js (local)

## Dokümantasyon
- 📒 [MEMORY.md](MEMORY.md) — **Proje hafızası**: kararlar, konuşmalar, açık sorular
- 🏛️ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Mimari taslağı
- 🧩 [docs/MODULES.md](docs/MODULES.md) — Modül kapsamları
- 🗃️ [docs/DATA-MODEL.md](docs/DATA-MODEL.md) — Veri modeli taslağı (MVP: Stok + Üretim)
- 🔎 [docs/RESEARCH-MOBLESIS.md](docs/RESEARCH-MOBLESIS.md) — Rakip/referans analizi (MÖBLESİS)
- 🗺️ [docs/PLANNING.md](docs/PLANNING.md) — Yol haritası / fazlar
- 📑 [docs/DECISIONS.md](docs/DECISIONS.md) — Mimari karar kayıtları (ADR)

> Yeni bir oturuma başlarken önce `MEMORY.md` okunur.
