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
- **Teknoloji yönü (güncel):** Next.js + shadcn/ui, **saf on-premise** kurulum.
  - **Dağıtım:** Her fabrikanın kendi sunucusuna kurulum (self-hosted, internetsiz çalışır).
  - **Veritabanı:** PostgreSQL (Prisma ORM ile; ileride SQL Server kapısı açık).
  - **Auth:** NextAuth/Auth.js (local).
  - ❌ Bulut (Supabase Cloud + Vercel) iptal edildi.

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

### 2026-06-03 — DAĞITIM MODELİ KESİNLEŞTİ: SAF ON-PREMISE ✅
- Kullanıcı: "Bu sektör uygulamanın dışarıda olmasını istemeyecek gibi duruyor, yani local çalışmak gerekecek sanırım."
- **KARAR (Model A — Saf on-premise):** Uygulama her fabrikanın **kendi sunucusuna** kurulur. Veri tamamen fabrika içinde kalır; internet olmadan da çalışır. Önceki "bulut öncelikli (Supabase Cloud + Vercel)" kararı **iptal edildi.**
- **KARAR — Veritabanı: PostgreSQL.** Gerekçe: çok sayıda fabrikaya tek tek kurulacak bir üründe asıl avantaj kurulum/geliştirme hızı + lisans derdinin olmaması. Çalışma performansı bu iş yükü için fazlasıyla yeterli. Uygulamanın içine paketlenip "tak-çalıştır" teslim edilebilir. (Kullanıcı "hız açısından en mantıklı" olanı sordu → PostgreSQL.)
- **KARAR — ORM: Prisma.** Veri erişimi soyutlanır; ileride bir müşteri SQL Server isterse kapı açık kalır.
- **Bunun sonuçları (önceki kararları değiştirir):**
  - ❌ Vercel iptal → Next.js, fabrikanın sunucusunda kendi kendine barınan (self-hosted) Node servisi olarak (Docker ile paketlenir).
  - ❌ Supabase Cloud + Supabase Auth iptal → **Auth: NextAuth/Auth.js** (kendi içinde, local kimlik doğrulama).
  - 🔁 **Multi-tenant RLS gereksiz.** Her kurulum tek bir fabrikaya ait (fiilen single-tenant). İş modeli hâlâ "çok sayıda fabrikaya satış" ama her satış = ayrı kurulum. `company_id` yine de korunabilir (bir fabrikanın **çok şubesi/çok şirketi** olabilir).
  - ➕ Yeni gündem maddeleri: **lisanslama/aktivasyon**, **güncelleme dağıtımı** (çok sahaya), **yedekleme**, **kurulum paketleme** (Docker mı / Windows installer mı?).

### 2026-06-03 — Kurulum, güncelleme ve lisanslama netleşti ✅
- Kullanıcı: "Hepsinde sunucu olur, genelde **Windows Server** olur. Güncellemeleri **internetten** dağıtırız, gerekirse bir **API sunucusu** kurarız. Tabii ki **lisanslama, modül yönetimi** gibi işler olacak."
- **KARAR — Hedef ortam: Windows Server.** Her fabrikada gerçek bir sunucu var (köşedeki PC değil).
- **KARAR — İki ayrı sistem (topoloji):**
  1. **MobilyumPro (on-premise app):** Fabrikada Windows Server üzerinde çalışan asıl ERP. Müşteri verisi burada, içeride, offline çalışır.
  2. **Merkezi Lisans & Güncelleme Sunucusu (satıcıda/bulutta):** Müşteri, lisans, **modül yetkilendirme** ve sürüm dağıtımı. Burada müşteri iş verisi YOK → bulutta olabilir.
- **KARAR — Güncelleme: internet üzerinden**, merkezi sunucudan. (Fabrikada internet varken çeker.)
- **KARAR — Lisanslama: modül bazlı.** Müşteri hangi modülleri (Stok/Üretim/Cari/Satış...) aldıysa o açılır. → **Modular monolith + lisansla açılan modüller.**
- 🔑 **Tasarım kuralı:** Lisans **imzalı ve offline-grace'li** olacak. İnternet kesik olsa bile fabrika çalışmaya devam eder; lisans periyodik (internet varken) yenilenir. Lisans sunucusuna ulaşılamaması üretimi ASLA durdurmaz.
- 🟡 Açık kalan implementasyon detayı: Paketleme **Docker Compose** mı yoksa **native Windows installer** mı? (Öneri: Docker — temiz, güncellemesi kolay; Windows Server destekliyor.)

### 2026-06-03 — MVP kapsamı ve fatura beklentisi netleşti ✅
- Kullanıcı: MVP aslında **Stok ve Üretim**. (Önceki "Cari → Stok → Satış → Üretim" sırası değişti.)
- **KARAR — MVP = Stok + Üretim.** Cari ve Satış sonraki fazlara kaydı. Gerekçe: mobilya fabrikasının çekirdek operasyonu üretim ve stok.
- Kullanıcı: Fatura tarafında **e-Fatura ileride gerekli**.
- **KARAR — Veri modeli baştan e-Fatura'ya hazır kurulacak:** ürünlerde KDV oranı + e-Fatura birim kodu (C62=adet, MTK=m², MTR=metre...), opsiyonel GTIP; firmada VKN/TCKN, vergi dairesi, adres alanları. (Şimdi eklemek ucuz; resmi e-Fatura entegrasyonu Satış modülüyle gelecek.)
- **Aksiyon:** MVP (çekirdek + Stok + Üretim) için `docs/DATA-MODEL.md` taslağı hazırlanıyor. Gerekçe: SaaS için tek kod tabanı, merkezi güncelleme, kolay müşteri ekleme (onboarding). Her müşteriye ayrı on-premise kurulum SaaS modeline uymaz.
- ✅ **Tenant izolasyonu: Paylaşımlı veritabanı + `company_id` + PostgreSQL RLS (Row Level Security).** Standart, maliyet-etkin SaaS deseni; Supabase ile doğal uyumlu.
- 🟡 **On-premise (SQL Server) opsiyonu:** Birincil değil; ileride "kurumsal/özel kurulum" isteyen büyük müşteriler için açık kapı. Bu yüzden veri erişimi yine de ORM (Prisma) ile soyutlanacak ve DB'ye özgü kestirmelerden kaçınılacak. (Karar: erteleme — gerçek talep gelince değerlendirilecek.)
- ✅ **Auth: Supabase Auth.** Multi-tenant + RLS ile entegre çalışır.

---

## ⏸️ MOLA / SONRAKİ OTURUM (2026-06-03)

**Durum:** Planlama iyi ilerledi; temel mimari kararlar alındı. Şimdi mola.

**Kullanıcının yapacağı (saha araştırması):**
- Bir **fabrikaya gidip üretim sürecini bizzat görecek** (kaç istasyon, akış nasıl ilerliyor).
- **Halihazırda aktif bir yazılım kullanan bir fabrika çalışanından**, kullandıkları program hakkında bilgi alacak (neyi seviyor/sevmiyor, eksikler, akış).
- **Kullandıkları yazılım: MÖBLESİS** (mobilya üretimine özel ERP, İnegöl/Bursa kökenli). Ön araştırma yapıldı → `docs/RESEARCH-MOBLESIS.md`. Öne çıkanlar: barkod tabanlı üretim takibi, **saha terminalleriyle istasyon bazlı takip**, B2B bayi sipariş uygulaması, kumaş/renk varyantları. Saha ziyaretinde bu ekranlar gözlemlenecek (kontrol listesi research dosyasında).

**Bu araştırma şunları netleştirecek (DATA-MODEL.md açık noktaları):**
1. Üretim aşama takibi derinliği (sadece "tamamlandı" mı / istasyon istasyon mu?) — *en kritik*
2. Fire/zayiat: sabit % mı, değişken mi?
3. Birim dönüşümü (m²/plaka/metretül): otomatik mi, manuel mi?
4. Maliyet: sadece malzeme mi, işçilik/genel gider de mi?
5. Parti/seri takibi gerekli mi?
6. Barkod ile depo giriş/çıkış MVP'de var mı?

**Döndüğünde devam noktası:** Saha bulgularına göre `docs/DATA-MODEL.md`'yi
keskinleştir → onaylanınca Prisma şemasına dönüştür → Faz 1 (proje iskeleti) başlasın.

> 📌 Yeni oturuma başlarken: önce bu `MEMORY.md`'yi oku, sonra `docs/` dosyalarını.

---

## ❓ Açık Sorular (cevap bekliyor)

> Bunlar planlamayı ilerletmek için netleşmesi gereken kritik kararlar.
> Cevaplandıkça Karar Kaydı'na taşınır.

1. ~~Dağıtım modeli~~ ✅ KARARLANDI: **Saf on-premise** (her fabrikaya kendi sunucusuna kurulum). Veritabanı: PostgreSQL + Prisma.
2. ~~Çok şirketli (multi-tenant) mi?~~ ✅ KARARLANDI: Her kurulum tek fabrikaya ait (single-tenant). `company_id` çok-şube için korunabilir.
3. **Kullanıcı/rol yapısı:** Kaç tür kullanıcı var? (ör. yönetici, depo, üretim, satış, muhasebe)
9. **Kurulum paketleme:** Docker mı, Windows installer mı? Hedef fabrika sunucusu genelde ne? (Windows Server / normal PC?)
10. **Güncelleme dağıtımı:** Çok sahaya yeni sürüm nasıl ulaşacak? (manuel / otomatik?)
11. **Lisanslama:** Ürün nasıl lisanslanacak/aktive edilecek (lisans anahtarı, süre?)
12. **Yedekleme:** Fabrikadaki veriyi kim/nasıl yedekleyecek?
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
