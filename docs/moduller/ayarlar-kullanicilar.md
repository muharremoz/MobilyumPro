# Ayarlar & Kullanıcılar

**Durum:** ✅ Mevcut

## Amaç
Sistem geneli ayarlar, döviz kurları, veritabanı bağlantısı ve kullanıcı /
rol / yetki yönetimi.

## Ekranlar
- Genel — `/ayarlar`
- Sistem Parametreleri — `/ayarlar/parametreler`
- Döviz Kurları — `/ayarlar/kurlar`
- Bağlantı Bilgileri — `/ayarlar/baglanti`
- Kullanıcılar & Roller — `/kullanicilar` (yetkiler: `/kullanicilar/yetkiler`)

## Ana kayıtlar / kavramlar
- **Kullanıcı** (`Kullanici`) — rol + opsiyonel departman; şifre scrypt.
- **Rol** (`Rol`) + **Departman** (`Departman`).
- **Yetki matrisi** — rol × modül × bayrak (Liste / Ekle / Güncelle / Sil); `src/lib/yetki.ts`.
- **Sistem parametreleri** — örn. `uretimde_hemen_dus`, `varsayilan_depo`.
- **Döviz kurları** (`Kur`) — TCMB; alış maskesi / döviz karşılığı için.

> Not: Oturum/giriş altyapısı henüz stub; rol/departman kontrolleri şimdilik
> sayfaların seçtiği "mevcut kullanıcı" üzerinden çalışır (TODO: gerçek oturum).

## İlgili kod
- Yetki: `src/lib/yetki.ts` — `MODULLER`, `YETKI_BAYRAKLARI`
- Tipler: `src/lib/data.ts` — `Kur`; şema: `prisma/schema.prisma` (`Kullanici`, `Rol`, `Departman`)
- UI: `src/components/users/*`, `src/components/settings/*`, `src/app/(panel)/ayarlar/`, `src/app/(panel)/kullanicilar/`
