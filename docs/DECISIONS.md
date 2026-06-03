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

## ADR-0005: Paketleme, kurulum, güncelleme ve lisanslama
- Tarih: 2026-06-03
- Durum: 🔴 AÇIK (on-premise satışın en kritik operasyonel konusu)
- Bağlam: Ürün çok sayıda fabrikanın kendi sunucusuna kurulacak; sürüm güncellemeleri ve lisans yönetimi gerekiyor.
- Karar: — (Docker mı / Windows installer mı, otomatik güncelleme, lisans anahtarı/aktivasyon... tartışılacak.)
- Sonuçlar: Yanlış kurgu ilerde yüksek destek maliyeti yaratır. Hedef sunucu profili (Windows Server / PC) netleşmeli.
