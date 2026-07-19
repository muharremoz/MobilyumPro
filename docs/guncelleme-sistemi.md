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

## ✅ Kalan işler — tamamlandı

### Adım 3 — Windows servisi ✅
`scripts/servis-kur.ps1` (yönetici olarak, proje kökünde):

```powershell
.\scripts\servis-kur.ps1 -Saat 02:00      # kur / güncelle
.\scripts\servis-kur.ps1 -Kaldir          # geri al
```

- **Uygulama otomatik başlar.** NSSM varsa gerçek Windows servisi kurulur
  (çökünce dönüş NSSM'in işi). Yoksa "sistem açılışında" çalışan bir
  Zamanlanmış Görev kurulur — NSSM'i zorunlu tutup tek bir exe için kurulumu
  tıkamak istemedik. Görev SYSTEM hesabıyla çalışır, kimse oturum açmasa da
  uygulama ayakta kalır.
- **Gece görevi** (`MobilyumPro-Guncelleme`) `guncelle-zamanli.mjs`'i çağırır.
  O betik mod "otomatik" değilse dokunmaz — **görevi kurmak otomatik
  güncellemeyi AÇMAZ**, yalnız mümkün kılar.
- Betik sonunda `.env`'e yazılacak `GUNCELLE_RESTART_KOMUT` değerini basar
  (NSSM veya görev yoluna göre değişir).
- Yeniden çalıştırılabilir: var olan servis/görev güncellenir.
- Saat UI'da da tutuluyor ama **tetikleyen Windows'tur**; saati değiştirmek
  için betiği `-Saat` ile yeniden çalıştırın.

### Adım 4 — Installer ✅
`scripts/kurulum.ps1` (yönetici olarak):

```powershell
.\kurulum.ps1 -RepoUrl "git@github.com:muharremoz/MobilyumPro.git"
.\kurulum.ps1 -RepoUrl "..." -Hedef "D:\MobilyumPro" -Saat 03:30
```

Sırasıyla: ön koşul denetimi (git/node 20+/npm) → clone (veya var olanı
güncelle) → `.env` → `npm ci` → `prisma generate` → **DB hazırlığı** →
`npm run build` → servis + gece görevi.

- **Var olan kurulumu SİLMEZ**, günceller; `.env` korunur. Kurulum betiğinin
  veri ya da ayar kaybettirmesi kabul edilemez.
- `OTURUM_ANAHTARI` kurulumda rastgele üretilir.
- **DB hazırlığı kendi karar verir** (`scripts/db-tablo-sayisi.mjs` ile tablo
  sayısına bakar):
  - boş DB → `prisma migrate deploy`
  - verili DB → `prisma migrate resolve --applied 0_init` (**veriye dokunmaz**)
  - bağlanılamıyorsa durur ve söyler — yanlış tarafa düşüp veri kaybetmektense
    kurulumu kesmek doğrusu.
- `.env` ilk kez oluşturulduğunda `DATABASE_URL` düzenlenmesi için durur.

### Adım 5 — İlk kurulum ekranı ✅

Betik biter ama panele **henüz girilemez**: `migrate deploy` şemayı kurar,
tek bir kullanıcı bile basmaz (seed de basmaz — müşteri DB'sine sahte veri
girmiyoruz). Kullanıcı yokken `/login` listesi boştur; kurulum kendini
kilitler. Kilidi açan tek kapı `/kurulum` ekranıdır.

- Kullanıcı **yokken**: `/` ve `/login` → `/kurulum`'a yönlenir.
- Kullanıcı **varken**: `/kurulum` → `/login`'e yönlenir ve bir daha açılmaz.
- Ekran firma adını (`firma_adi` parametresi), varsayılan rolleri
  (Yönetici / Kullanıcı / Görüntüleyici) ve `USR-1001` **Yönetici**
  kullanıcısını oluşturur, ardından oturumu açar.

Kapı iki katmanlı: sayfa yönlendirmesi ekranı gizler, `ilkKurulum()` ise
işlemi **Serializable** bir transaction içinde yeniden denetler. Tek katman
bırakılsaydı, herkesin kendine yönetici açabildiği bir uç nokta kalırdı.

İlgili dosyalar: `src/lib/db/kurulum.ts`, `src/lib/db/kurulum-actions.ts`,
`src/app/kurulum/page.tsx`, `src/components/kurulum-form.tsx`.

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
| `scripts\kurulum.ps1` | Fabrika (ilk kurulum) | Sıfırdan kurar (yönetici) |
| `scripts\servis-kur.ps1` | Fabrika | Servis + gece görevi kurar (yönetici) |
| `node scripts/db-tablo-sayisi.mjs` | Fabrika | Tablo sayısı (kurulum kararı için) |

İlgili dosyalar: `scripts/surum-cikar.mjs`, `scripts/guncelle.mjs`,
`scripts/guncelle-zamanli.mjs`, `scripts/kurulum.ps1`, `scripts/servis-kur.ps1`,
`scripts/db-tablo-sayisi.mjs`, `src/lib/db/guncelleme-actions.ts`,
`src/components/settings/guncelleme.tsx`, `src/app/(panel)/ayarlar/guncelleme/`.

## Notlar

- **PowerShell betikleri UTF-8 BOM'lu kaydedilmeli.** Windows PowerShell 5.1
  BOM'suz `.ps1`'i ANSI sanıp Türkçe karakterlerde ayrıştırma hatası verir.
- Servis/görev kurulumu **yönetici** ister; betikler değilse baştan durur,
  yarım kurulum bırakmaz.
