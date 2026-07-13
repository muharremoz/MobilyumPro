# ============================================================================
#  MobilyumPro - Test PC ilk kurulum yardimcisi
#  Kullanim: proje klasorunde PowerShell'de ->  .\kurulum.ps1
#  On kosul: Node.js, Git ve SQL Server kurulu olmali; SQL Server'da
#            "mobilyumpro" veritabani ONCEDEN olusturulmus olmali (bkz. README).
# ============================================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== MobilyumPro kurulum ===" -ForegroundColor Cyan

# 1) .env yoksa ornekten olustur ve duzenlemesi icin ac
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host ""
  Write-Host "!! .env olusturuldu." -ForegroundColor Yellow
  Write-Host "   DATABASE_URL icindeki {PAROLA} kismini SQL Server 'sa' parolanla" -ForegroundColor Yellow
  Write-Host "   degistir, kaydet ve bu script'i TEKRAR calistir." -ForegroundColor Yellow
  Start-Process notepad ".env"
  exit 1
}

# 2) Bagimliliklar
Write-Host "==> npm install..." -ForegroundColor Cyan
npm install

# 3) Prisma client
Write-Host "==> Prisma generate..." -ForegroundColor Cyan
npm run db:generate

# 4) Sema -> veritabani (tablolari olusturur)
Write-Host "==> Veritabani semasi (db push)..." -ForegroundColor Cyan
Write-Host "    (Hata alirsan: SQL Server'da 'mobilyumpro' veritabanini olustur ve .env'i kontrol et.)" -ForegroundColor DarkGray
npx prisma db push

# 5) Ornek veri
Write-Host "==> Ornek veri yukleniyor (seed)..." -ForegroundColor Cyan
npm run db:seed

Write-Host ""
Write-Host "=== Kurulum tamam. Baslatiliyor: http://localhost:1616 ===" -ForegroundColor Green
npm run dev
