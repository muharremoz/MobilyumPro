# MEMORY — Proje Hafızası

> Bu dosya projenin **canlı hafızasıdır**. Konuştuğumuz her şey, aldığımız her
> karar, değişen fikirler ve açık sorular buraya tarih sırasıyla kaydedilir.
> Yeni bir oturuma başlarken önce bu dosya okunur.

---

## 📌 Proje Özeti (tek bakışta)

- **Proje adı:** MobilyumPro
- **Amaç:** Mobilya fabrikaları için modüler bir ERP/iş yönetim web uygulaması.
- **İş modeli:** ✅ **SaaS ürünü** — kendi fabrikamız yok; yazılım geliştirilip mobilya sektöründeki **birden çok fabrikaya satılacak**. (Belirli bir tek müşteri için değil.)
- **Ana modüller:** Stok, Üretim, Cari (müşteri/tedarikçi), Satış. (Devamı gelecek)
- **Aşama:** 🟡 **Planlama** — henüz kod yazılmıyor. Önce mimari ve özellikler.
- **Teknoloji yönü:** Next.js + shadcn/ui. Backend/dağıtım için iki senaryo:
  - **Bulut:** Supabase (Postgres) + Vercel
  - **Yerel (on-premise):** SQL Server ile lokal kurulum
  - (Hangisinin birincil olacağı **açık karar** — bkz. Açık Sorular)

---

## 🗂️ Karar Kaydı (Decision Log)

> Her satır bir karardır. Format: `TARİH — [DURUM] Karar — Gerekçe`
> DURUM: ✅ kesin · 🟡 geçici/öneri · ❌ iptal/değişti

### 2026-06-03
- ✅ Projeye **planlama** ile başlanacak; kodlama bir süre ertelendi. Gerekçe: önce mimari ve özelliklerin netleşmesi isteniyor.
- ✅ Dokümantasyon yapısı kuruldu: `MEMORY.md`, `docs/ARCHITECTURE.md`, `docs/MODULES.md`, `docs/PLANNING.md`, `docs/DECISIONS.md`.
- 🟡 Frontend framework: **Next.js (App Router)** — öneri, onay bekliyor.
- 🟡 UI kütüphanesi: **shadcn/ui + Tailwind CSS** — öneri, onay bekliyor.
- 🟡 Veritabanı/dağıtım: Supabase+Vercel **veya** lokal SQL Server — **henüz seçilmedi** (kullanıcı kararsız, tartışılacak).
- ✅ **Kapsam:** Dört modülün hepsi (Cari, Stok, Satış, Üretim) projede olacak. MVP başlangıç sırası tartışılacak (öneri: Cari → Stok → Satış → Üretim).
- 🔴 Multi-tenant kararı: kullanıcı kararsız, tartışılacak.
- 🔴 Üretim tipi (MTO/MTS): kullanıcı kararsız, tartışılacak.

---

## 💬 Konuşma Notları (kronolojik)

### 2026-06-03 — İlk oturum
- Kullanıcı yeni projeye başlıyor: mobilya fabrikaları için stok/üretim/cari/satış modülleri olan web uygulaması.
- Teknoloji tercihi: Next.js + shadcn. Dağıtım duruma göre Supabase/Vercel ya da lokal SQL Server.
- İstek: "Şimdi kodlamaya bir süre geçmeyeceğiz, önce planlama yapılacak, mimari ve özellikler konuşulacak."
- İstek: Gerekli `.md` dosyaları oluşturulsun, `MEMORY.md`'ye durum kaydedilsin; kararlar ve konuşmalar burada tutulacak.
- **Aksiyon:** Planlama dokümanları oluşturuldu. Bir sonraki adım: mimari & modül kararlarını birlikte netleştirmek (bkz. Açık Sorular).
- **Kullanıcı yanıtları (4 soru):**
  - Dağıtım modeli → *henüz emin değil* (tartışılacak).
  - Multi-tenant → *henüz emin değil* (tartışılacak).
  - MVP modülleri → **dördü de seçildi** (Cari, Stok, Satış, Üretim hepsi kapsamda).
  - Üretim tipi → *henüz emin değil* (tartışılacak).
- Çoğu mimari karar açık kaldığı için, bir sonraki turda trade-off analizi sunup birlikte karar verilecek.
- **Kullanıcı netleştirmesi:** "Evet satılacak çünkü fabrikam yok, yazılımı yapıp satacağız ama bir fabrikaya değil, o sektörde kim isterse verilecek."
  - ⇒ Bu bir **SaaS ürünü**. Bu netleşme sayesinde dağıtım ve multi-tenant kararları kesinleşti (aşağıya bkz.).

### 2026-06-03 — Mimari kararlar (SaaS netleşmesi sonrası)
- ✅ **İş modeli: Çok kiracılı (multi-tenant) SaaS.** Birden çok fabrikaya satılacak.
- ✅ **Dağıtım: Bulut öncelikli — Supabase (PostgreSQL) + Vercel.** Gerekçe: SaaS için tek kod tabanı, merkezi güncelleme, kolay müşteri ekleme (onboarding). Her müşteriye ayrı on-premise kurulum SaaS modeline uymaz.
- ✅ **Tenant izolasyonu: Paylaşımlı veritabanı + `company_id` + PostgreSQL RLS (Row Level Security).** Standart, maliyet-etkin SaaS deseni; Supabase ile doğal uyumlu.
- 🟡 **On-premise (SQL Server) opsiyonu:** Birincil değil; ileride "kurumsal/özel kurulum" isteyen büyük müşteriler için açık kapı. Bu yüzden veri erişimi yine de ORM (Prisma) ile soyutlanacak ve DB'ye özgü kestirmelerden kaçınılacak. (Karar: erteleme — gerçek talep gelince değerlendirilecek.)
- ✅ **Auth: Supabase Auth.** Multi-tenant + RLS ile entegre çalışır.

---

## ❓ Açık Sorular (cevap bekliyor)

> Bunlar planlamayı ilerletmek için netleşmesi gereken kritik kararlar.
> Cevaplandıkça Karar Kaydı'na taşınır.

1. ~~Dağıtım modeli~~ ✅ KARARLANDI: Bulut öncelikli (Supabase + Vercel). On-premise ileri faz opsiyonu.
2. ~~Çok şirketli (multi-tenant) mi?~~ ✅ KARARLANDI: Evet, multi-tenant SaaS.
3. **Kullanıcı/rol yapısı:** Kaç tür kullanıcı var? (ör. yönetici, depo, üretim, satış, muhasebe) — SaaS'ta ayrıca: müşteri firma yöneticisi vs. platform (bizim) süper-admin ayrımı.
4. **Üretim modeli:** Siparişe göre üretim (MTO) mu, stoğa üretim (MTS) mi, ikisi de mi? Reçete/BOM (ürün ağacı) gerekecek mi?
5. **Mevcut sistem:** Halihazırda kullanılan bir yazılım/Excel/veritabanı var mı? Veri göçü gerekecek mi?
6. **e-Fatura / muhasebe entegrasyonu** beklentisi var mı? (GİB e-Fatura, Logo/Mikro vb.)
7. **Dil/para birimi:** Sadece TR/TL mi, çoklu dil/döviz gerekecek mi?
8. **Ölçek:** Tahmini kullanıcı sayısı, ürün/stok kalemi sayısı, günlük işlem hacmi?

---

## 🔗 İlgili Dokümanlar
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Mimari yaklaşım ve teknoloji yığını
- [docs/MODULES.md](docs/MODULES.md) — Modül kapsamları ve özellikler
- [docs/PLANNING.md](docs/PLANNING.md) — Yol haritası ve fazlar
- [docs/DECISIONS.md](docs/DECISIONS.md) — Detaylı mimari karar kayıtları (ADR)
