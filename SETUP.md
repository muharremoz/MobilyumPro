# MobilyumPro — Geliştirici Kurulumu (Windows)

Uygulama **yerel/offline** çalışır: her geliştiricinin kendi bilgisayarında
kendi **SQL Server** örneği + kendi verisi olur. Bulut/Vercel gerekmez.
`.env` git'e girmez — herkes kendi bağlantı bilgisini kurar.

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

`.env.example`'ı `.env` olarak kopyala ve `sa` şifreni yaz:

```
DATABASE_URL="sqlserver://localhost:1433;database=mobilyumpro;user=sa;password=<SA_SIFRESI>;trustServerCertificate=true;encrypt=true"
```

> Şifrede `;` KULLANMA (bağlantı string'ini bozar). `%` gibi diğer özel
> karakterler sorunsuz.

## 5. Şemayı bas + veriyi doldur

```powershell
npx prisma generate      # Prisma client üret
npx prisma db push       # tabloları oluştur
npm run db:seed          # mock veriyi (src/lib/data.ts) yükle
```

## 6. Çalıştır

```powershell
npm run dev              # http://localhost:1616
```

---

## Sık karşılaşılanlar

- **`ECONNREFUSED 127.0.0.1:1433`** → SQL Server çalışmıyor ya da TCP/1433
  kapalı. Servisi başlat, TCP/IP'yi aç.
- **Login failed for user 'sa'** → Mixed Mode kapalı veya şifre yanlış.
- **Şema değişikliği pull ettikten sonra** → tekrar `npx prisma db push`
  (kolon düşmesi gerekiyorsa `npx prisma db push --accept-data-loss`).
  SQL Server "default constraint" hatası verirse, ilgili kolonun default
  constraint'ini düşürüp tekrar dene.
- **Yeni Prisma tipi görünmüyor / kilit hatası** → dev server'ı durdurup
  `npx prisma generate` çalıştır.

## Notlar

- `.env` **git'e girmez** (`.gitignore`). Her makine kendi `.env`'ini kurar.
- Veri paylaşılmaz; herkes seed'den kendi kopyasıyla çalışır.
- `backups/*.sql` dosyaları **eski PostgreSQL** dönemine ait (tarihsel),
  yeni SQL Server kurulumunda kullanılmaz — veri için `db:seed` yeterli.
