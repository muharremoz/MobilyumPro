# ============================================================================
#  MobilyumPro - Baslat ve ac (masaustu kisayolu bunu calistirir)
#  Sunucu kapaliysa production sunucusunu baslatir, sonra tarayiciyi acar.
#  Zaten calisiyorsa sadece tarayiciyi acar.
# ============================================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$adres = "http://localhost:1616"

# Zaten calisiyor mu?
$calisiyor = Get-NetTCPConnection -LocalPort 1616 -State Listen -ErrorAction SilentlyContinue
if ($calisiyor) {
  Start-Process $adres
  return
}

# Production derleme yoksa once derle
if (-not (Test-Path ".next")) {
  Write-Host "Ilk calistirma: uygulama derleniyor (npm run build)..." -ForegroundColor Cyan
  npm run build
}

# Sunucuyu ayri bir pencerede baslat (kapatmak istenince o pencere kapatilir)
Start-Process powershell -ArgumentList `
  "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd `"$PSScriptRoot`"; npm run start"

# Sunucu ayaga kalkana kadar bekle (en fazla ~30 sn), sonra tarayiciyi ac
Write-Host "Sunucu baslatiliyor, lutfen bekleyin..." -ForegroundColor Cyan
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  if (Get-NetTCPConnection -LocalPort 1616 -State Listen -ErrorAction SilentlyContinue) { break }
}
Start-Process $adres
