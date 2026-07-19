# Otomatik & Uzaktan Güncelleme Sistemi

Müşteri fabrika sunucularının, yeni sürümleri git üzerinden **kesintisiz** ve
**offline-güvenli** biçimde almasını sağlayan sistem.

## Senaryo (kararlaştırıldı)

- Uygulama **tek bir fabrika sunucusuna** kurulur (Windows). Kullanıcılar ağdan
  tarayıcıyla bağlanır. Uygulama **port 1616**'da (`next start`) çalışır.
- **Offline çalışabilmeli** — internet yokken uygulama durmaz, güncelleme
  kontrolü sessizce atlanır.
- Güncelleme dağıtımı: kaynak **private** kalır; sunucu, senin kontrolündeki
  private repo'dan **token ile** çeker. Public repo YOK.
- **push ≠ sürüm.** İstediğin kadar push yaparsın, müşteri etkilenmez. Sadece
  `npm run surum-cikar` ile **etiketlediğin** sürümler fabrikaya açılır (Mod A).
- Güncelleme **danışmalıdır** — sunucu yeni sürümü indirir ama hemen kurmaz;
  ya gece belirlenen saatte, ya yönetici onayıyla kurulur.

## Mimari — akış

```
SENİN TARAFIN                    FABRİKA SUNUCUSU (Windows)
─────────────                    ──────────────────────────
kod → git push (serbest)         [gece görevi / "Kontrol et" butonu]
  ↓                              1. internet varsa: yeni etiket var mı?
npm run surum-cikar   ◄──────────
  → vX.Y.Z etiketi               2. varsa moda göre:
     (private repo)                 - otomatik → gece saatinde kur
                                    - elle    → "Şimdi uygula" onayı bekler
                                 3. kur: checkout + npm ci + migrate deploy
                                    + build + servis restart
                                 4. hata olursa → eski sürüme ROLLBACK
```

---

## ✅ Tamamlanan işler

### Adım 0 — Prisma migration temeli
- `prisma/migrations/0_init/` — mevcut şemadan üretilen baseline (49 tablo),
  veriye dokunmaz. `migration_lock.toml` provider = `sqlserver`.
- Bundan sonra prod güncellemesi **`prisma migrate deploy`** kullanır (veriyi
  korur). Dev'de `db push` ile çalışmaya devam edebilirsin; kesinleşen
  değişikliği migration'a çevirirsin.
- **Kritik:** `db:geri-yukle` (snapshot siler-yükler) müşteri sunucusunda
  ASLA çalışmamalı — veri kaybı olur. Güncelleyici onu çağırmaz.

### Adım 1 — Sürüm çıkarma + güncelleyici
- `scripts/surum-cikar.mjs` → `npm run surum-cikar [patch|minor|major|X.Y.Z]`
  package.json sürümünü yükseltir, `vX.Y.Z` commit + etiket atar, push eder.
  Yalnız temiz + origin ile senkron `main` dalından çalışır.
- `scripts/guncelle.mjs` → fabrika güncelleyicisi.
  - `--kontrol` modu: JSON basar, hiçbir şeyi değiştirmez (offline'da sessiz).
  - Tam mod: build + `migrate deploy` + restart. Hata olursa eski commit + eski
    `.next` geri gelir (rollback). `.guncelle.kilit` ile tek çalışır.
  - `/uploads` ve `.env` git dışı → checkout onlara dokunmaz.

### Adım 2 — Danışmalı zamanlama + yönetim ekranı
- **Ayarlar → Yazılım Güncelleme** (`/ayarlar/guncelleme`): kurulu/en yeni
  sürüm, "Kontrol et", "Şimdi uygula" (onaylı), mod seçimi + gece saati.
- `src/lib/db/guncelleme-actions.ts`: `guncellemeAyarlari` (hızlı, ağsız),
  `guncellemeKontrolEt` (ağ), `guncellemeAyarKaydet`, `guncellemeUygula`
  (kopuk süreç — restart ana süreci öldürmesin). Hepsi `ayarlar/isUpdate` ister.
- Modlar `SistemParametre`'de: `guncelleme_mod` ∈ {otomatik, elle, kapali},
  `guncelleme_saat` (HH:MM, vars. 02:00). **Şema değişmedi.**
- `scripts/guncelle-zamanli.mjs`: gece görevi kapısı — mod `otomatik` değilse
  dokunmaz; DB okunamazsa güvenli tarafta kalıp güncelleme yapmaz.

---

## ⬜ Kalan işler

### Adım 3 — Windows servisi
Uygulama makine açılınca kendiliğinden kalkmalı; gece görevi kayıtlı olmalı.

- [ ] **Servis kaydı** — Önerilen: **NSSM** (küçük exe, `next start`'ı servise
      çevirir). Alternatif: `node-windows`.
  - Servis adı örn. `MobilyumPro`, komut: `npm run start` (port 1616),
    çalışma dizini = proje kökü.
  - `guncelle.mjs`'deki `GUNCELLE_RESTART_KOMUT` bu servisi yeniden başlatacak
    (örn. `nssm restart MobilyumPro`) — `.env`'e yazılmalı.
- [ ] **Gece görevi** — Windows **Task Scheduler** ile her gün seçilen saatte
      `node scripts/guncelle-zamanli.mjs` (çalışma dizini = proje kökü).
  - Not: Saat ayarı UI'da tutuluyor ama görevi asıl tetikleyen Task Scheduler.
    Basit yol: görevi sabit bir saate (02:00) kur, `guncelleme_saat` ile
    hizala. İleri seviye: UI saat değişince görevi güncelleyen küçük bir adım.
- [ ] **`.env` şablonu** — güncelleyici ortam değişkenleri:
  - `DATABASE_URL` (mevcut)
  - `GUNCELLE_DAL` = `main`
  - `GUNCELLE_RESTART_KOMUT` = `nssm restart MobilyumPro`
  - `GUNCELLE_DB_YEDEK_KOMUT` = migrate ÖNCESİ SQL Server yedeği alan komut
    (örn. `sqlcmd ... BACKUP DATABASE ...`). Ayarlıysa ve başarısızsa
    güncelleme başlamaz — güvenlik ağı.

### Adım 4 — Installer (ilk kurulum paketi)
Fabrikaya ilk kurulumu tek elden yapan paket/script.

- [ ] Node.js kurulumu (veya gömülü node).
- [ ] Repo'yu token ile `git clone` (salt-okunur **Deploy Key** veya PAT).
- [ ] `.env` oluştur (DB bağlantısı + yukarıdaki güncelleme değişkenleri).
- [ ] `npm ci` → `npx prisma generate` → `npm run build`.
- [ ] **DB baseline:** mevcut verisi olan DB'de
      `npx prisma migrate resolve --applied 0_init` (0_init'i "uygulanmış"
      işaretler, veriye dokunmaz). Sıfır DB'de `npx prisma migrate deploy`.
- [ ] Servisi kur + başlat (Adım 3).
- [ ] Gece görevini kaydet (Adım 3).

---

## Önemli kurallar / tuzaklar

- **Veri asla silinmez:** güncelleme yalnız `prisma migrate deploy`. `db push`
  ve `db:geri-yukle` prod güncellemesinde kullanılmaz.
- **DB migration geri alınamaz:** rollback kodu + build'i döndürür ama şema
  ileri-yönlüdür. Bu yüzden `GUNCELLE_DB_YEDEK_KOMUT` (migrate öncesi yedek)
  prod'da mutlaka ayarlanmalı.
- **Kullanıcı dosyaları:** `/uploads` git dışı — güncelleme ona dokunmaz,
  yedeklemeye ayrıca dahil edilmeli.
- **Sürüm kaynağı tek:** `package.json` sürümü ile `vX.Y.Z` etiketi birlikte
  ilerler (`surum-cikar.mjs` ikisini birden yapar). Elle ayırma.
- **Rollback sonrası:** `guncelle.log` (proje kökü) güncelleme çıktısını tutar;
  sorun olursa oraya bakılır.

## Komut özeti

| Komut | Nerede | Ne yapar |
|-------|--------|----------|
| `npm run surum-cikar` | Senin makinen | Yeni müşteri sürümü etiketler (patch) |
| `npm run surum-cikar -- minor` | Senin makinen | Minor sürüm |
| `npm run guncelle:kontrol` | Fabrika | Yeni sürüm var mı (JSON, değiştirmez) |
| `npm run guncelle` | Fabrika | Güncellemeyi uygular (rollback'li) |
| `node scripts/guncelle-zamanli.mjs` | Fabrika (gece görevi) | Mod otomatikse günceller |

İlgili dosyalar: `scripts/surum-cikar.mjs`, `scripts/guncelle.mjs`,
`scripts/guncelle-zamanli.mjs`, `src/lib/db/guncelleme-actions.ts`,
`src/components/settings/guncelleme.tsx`, `src/app/(panel)/ayarlar/guncelleme/`.
