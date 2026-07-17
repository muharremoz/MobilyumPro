# MobilyumPro — Geliştirici Kurulumu (Windows)

Uygulama **yerel/offline** çalışır: her geliştiricinin kendi bilgisayarında
kendi **SQL Server** örneği olur. Bulut/Vercel gerekmez.
`.env` git'e girmez — herkes kendi bağlantı bilgisini kurar.

**Veri git ile taşınır** — `prisma/veri/snapshot.json`. Boş veritabanıyla
başlamazsın; adım 6'da snapshot'ı yüklersin. Detay: "Makineler arası veri
taşıma".

## 1. Gereksinimler

- **Node.js 20+** — https://nodejs.org
- **SQL Server** (ücretsiz **Express** yeterli) —
  https://www.microsoft.com/sql-server/sql-server-downloads
- (Opsiyonel) **SSMS** (SQL Server Management Studio) veya `sqlcmd` —
  DB oluşturmak/kontrol için.

## 2. SQL Server'ı hazırla (bir kez)

1. SQL Server Express'i kur.
2. Kurulumda / sonrasında **Mixed Mode (SQL Server + Windows auth)** etkinleştir
   ve **`sa`** kullanıcısına bir şifre belirle. (Proje `.env.example` `sa` ile
   bağlanıyor.)
3. TCP/IP protokolünü aç (SQL Server Configuration Manager → Network Config →
   Protocols → TCP/IP → Enabled) ve **1433** portunu doğrula.
   Configuration Manager yoksa registry'den de açılır → bkz. "Sık karşılaşılanlar".
4. `mobilyumpro` veritabanını oluştur. SSMS'te `New Database → mobilyumpro`,
   veya komut satırından:
   ```powershell
   sqlcmd -S localhost -U sa -P "<SA_SIFRESI>" -Q "IF DB_ID('mobilyumpro') IS NULL CREATE DATABASE mobilyumpro"
   ```

## 3. Projeyi kur

```powershell
git clone <repo-url>
cd MobilyumPro
npm install
```

## 4. `.env` oluştur

`.env.example`'ı `.env` olarak kopyala ve `sa` şifreni **süslü parantez içine**
yaz:

```
DATABASE_URL="sqlserver://localhost:1433;database=mobilyumpro;user=sa;password={<SA_SIFRESI>};trustServerCertificate=true;encrypt=true"
```

> Süslü parantez `.env.example`'daki `{PAROLA}` yer tutucusunun yerine gelir ve
> şifredeki özel karakterleri kaçırır — parantezleri silme.
> Şifrede `;` KULLANMA (bağlantı string'ini bozar). `%` gibi diğer özel
> karakterler sorunsuz.

## 5. Şemayı bas

```powershell
npx prisma generate      # Prisma client üret
npx prisma db push       # tabloları oluştur
```

## 6. Veriyi yükle

```powershell
npm run db:geri-yukle    # prisma/veri/snapshot.json → DB
```

> Bu adımı atlama. Boş DB ile `npm run build` çalıştırırsan prerender sırasında
> `P2002 unique constraint` hatası alabilirsin (varsayılan tanımları paralel
> worker'lar aynı anda eklemeye çalışıyor).

## 7. Çalıştır

```powershell
npm run dev              # http://localhost:1616
```

Production derlemesi (sayfa geçişleri belirgin şekilde daha hızlı):

```powershell
npm run build
npm run start            # http://localhost:1616
```

---

## Makineler arası veri taşıma (ev ↔ ofis)

Veri git ile taşınır: `prisma/veri/snapshot.json`. (Kaynak: `AGENTS.md`)

- **Bırakmadan önce:** `npm run db:yedek` → snapshot'ı tazeler, sonra commit + push.
- **Devralırken:** `git pull` → `npx prisma db push` (şema) → `npm run db:geri-yukle`.

`db:geri-yukle` snapshot'taki tabloları **önce siler, sonra yükler** —
birleştirmez; iki makinede aynı veri olsun diyedir. Yerelde kaydetmediğin bir
şey varsa önce `db:yedek` al. İki makinede paralel veri girdiysen biri kaybolur.

Tablo listesi `scripts/db-tablolar.mjs`'de; yeni tablo eklenince oraya da
yazılmalı (IDENTITY id'li tablolar ayrıca `IDENTITY_TABLOLAR`'a).

## Veritabanı script'leri

| Komut | Ne yapar |
|---|---|
| `npm run db:yedek` | Satırları `prisma/veri/snapshot.json`'a yazar (git'e girer, makineler arası taşıma). |
| `npm run db:geri-yukle` | Snapshot'ı DB'ye yükler. İlgili tabloları **siler**, sonra yazar. |
| `npm run db:backup` | SQL Server native tam yedek → `backups/mobilyumpro_<zaman>.bak`. Yerel/tarihsel yedek; makineler arası taşıma için değil. |
| `npm run db:seed` | **İş verilerini siler** (stok, cari, sipariş, üretim…). Kullanıcı/rol/yetki/parametre korunur. |

> ⚠️ `db:seed`'i `db:geri-yukle` sonrası **çalıştırma** — snapshot'tan geri
> yüklediğin iş verisini (stok, depo, cari, sipariş, üretim…) siler. Sadece
> bilinçli olarak sıfırdan boş başlamak istediğinde kullan.

## Sık karşılaşılanlar

- **`ECONNREFUSED 127.0.0.1:1433`** → SQL Server çalışmıyor ya da TCP/1433
  kapalı. Servisi başlat, TCP/IP'yi aç.

  TCP/IP'yi registry'den açmak (yönetici PowerShell). Instance id'yi önce bul —
  varsayılan instance'ta `MSSQLSERVER`, named instance'ta `SQLEXPRESS`:
  ```powershell
  (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL")
  # örn. MSSQL16.MSSQLSERVER → yol aşağıdaki gibi olur
  Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp" -Name "Enabled" -Value 1 -Type DWord
  Restart-Service MSSQLSERVER -Force   # named instance ise: MSSQL$SQLEXPRESS
  ```
  Kontrol: `Test-NetConnection localhost -Port 1433` → `TcpTestSucceeded: True`.

- **Login failed for user 'sa'** → Mixed Mode kapalı veya şifre yanlış.
  Mixed Mode kontrolü: aynı registry yolunda `LoginMode` = **2** olmalı
  (1 = yalnız Windows auth).

- **`kur.ps1` "servisi bulunamadi" diyor** → Script `MSSQL$SQLEXPRESS` adlı
  **named instance** bekliyor. SQL Server'ı varsayılan instance (`MSSQLSERVER`)
  olarak kurduysan script çalışmaz; bu dosyadaki adımları elle izle.

- **Şema değişikliği pull ettikten sonra** → tekrar `npx prisma db push`
  (kolon düşmesi gerekiyorsa `npx prisma db push --accept-data-loss`).
  SQL Server "default constraint" hatası verirse, ilgili kolonun default
  constraint'ini düşürüp tekrar dene.

- **Yeni Prisma tipi görünmüyor / kilit hatası** → dev server'ı durdurup
  `npx prisma generate` çalıştır.

- **`npm run build` prerender'da `P2002` veriyor** → DB boş demektir.
  `npm run db:geri-yukle` çalıştır, sonra tekrar derle.

## Notlar

- `.env` **git'e girmez** (`.gitignore`). Her makine kendi `.env`'ini kurar.
- Veri **paylaşılır**: `prisma/veri/snapshot.json` git'te izlenir. Şema `prisma
  db push` ile, satırlar `db:yedek`/`db:geri-yukle` ile taşınır.
- `backups/*.bak` dosyaları SQL Server native yedekleridir (`npm run db:backup`
  üretir). Makineler arası taşıma için snapshot kullanılır; `.bak` yerel geri
  dönüş/arşiv içindir.
