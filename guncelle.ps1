# ============================================================================
#  MobilyumPro - Test PC guncelleme yardimcisi
#  Kullanim: proje klasorunde PowerShell'de ->  .\guncelle.ps1
#  Yaptigi: calisan dev'i durdurur -> git pull -> (gerekirse) npm install ve
#           prisma generate + db push -> dev sunucuyu tekrar baslatir.
#  Not: Test PC'de yerel kod degisikligi YAPMA; sadece kaynak burasi (dev PC).
# ============================================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 0) Prisma generate DLL kilidi vermesin diye calisan dev'i (port 1616) kapat
Write-Host "==> Calisan dev sunucusu durduruluyor (port 1616)..." -ForegroundColor Cyan
try {
  $conns = Get-NetTCPConnection -LocalPort 1616 -State Listen -ErrorAction Stop
  foreach ($c in $conns) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
} catch {
  # port dinlenmiyor - dev zaten kapali, sorun degil
}

# 1) git pull (once/sonra karsilastirmasi icin HEAD'i sakla)
$onceki = (git rev-parse HEAD).Trim()
Write-Host "==> git pull..." -ForegroundColor Cyan
git pull
if ($LASTEXITCODE -ne 0) {
  Write-Host "!! git pull basarisiz. Test PC'de yerel degisiklik olabilir." -ForegroundColor Red
  exit 1
}
$sonra = (git rev-parse HEAD).Trim()

if ($onceki -eq $sonra) {
  Write-Host "Zaten guncel; degisiklik yok." -ForegroundColor Green
} else {
  $degisen = git diff --name-only $onceki $sonra

  # 2) Bagimlilik degistiyse install
  if ($degisen -match "package(-lock)?\.json") {
    Write-Host "==> Bagimliliklar degisti: npm install..." -ForegroundColor Cyan
    npm install
  }

  # 3) Prisma sema degistiyse generate + push (veri kaybolabilir - test verisi)
  if ($degisen -match "prisma/schema\.prisma") {
    Write-Host "==> Prisma sema degisti: generate + db push..." -ForegroundColor Cyan
    npm run db:generate
    npx prisma db push --accept-data-loss
    Write-Host "    (Sema degisti; ornek veriyi tazelemek istersen: npm run db:seed)" -ForegroundColor DarkGray
  }
}

# Production derleme (dev'e gore cok daha hizli sayfa gecisi) + baslat
Write-Host ""
Write-Host "==> Uygulama derleniyor (npm run build)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "!! Derleme basarisiz. Yukaridaki hataya bak." -ForegroundColor Red
  exit 1
}
Write-Host "==> Baslatiliyor: http://localhost:1616" -ForegroundColor Green
npm run start
