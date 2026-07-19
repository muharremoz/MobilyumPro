<#
.SYNOPSIS
  setup.exe'nin içine girecek dosyaları hazırlar. (Adım 6)

.DESCRIPTION
  Sırasıyla:
    1. Bağımlılıkları kurar ve uygulamayı derler (npm ci + build)
    2. Node.js runtime'ını indirir ve pakete gömer
    3. Yayımlanacak dosyaları `dist-paket\` altında toplar

  Sonra `scripts\setup.iss` Inno Setup ile derlenip tek .exe üretilir.

  NEDEN node_modules komple gidiyor: kurulum sihirbazı şemayı
  `prisma migrate deploy` ile kuruyor ve güncelleme sistemi de aynı yolu
  kullanıyor. Prisma CLI devDependency olduğu için `--omit=dev` ile budarsak
  müşteri sunucusunda ne kurulum ne güncelleme çalışır.

.PARAMETER NodeSurum
  Gömülecek Node.js sürümü. Varsayılan: 22.11.0 (LTS)

.PARAMETER Cikti
  Hazırlanan dosyaların toplanacağı klasör. Varsayılan: dist-paket

.PARAMETER AtlaBuild
  npm ci + build adımını atlar (zaten derlenmişse).

.EXAMPLE
  .\scripts\paket-hazirla.ps1
#>
[CmdletBinding()]
param(
  [string]$NodeSurum = "22.11.0",
  [string]$Cikti = "dist-paket",
  [switch]$AtlaBuild
)

$ErrorActionPreference = "Stop"
function Adim($m) { Write-Host "`n=== $m" -ForegroundColor Cyan }
function Bilgi($m) { Write-Host "    $m" }

$Kok = Split-Path -Parent $PSScriptRoot
Set-Location $Kok
$CiktiTam = Join-Path $Kok $Cikti

# ── 1) Derleme ────────────────────────────────────────────────────────
if ($AtlaBuild) {
  Adim "Derleme atlandı (-AtlaBuild)"
  if (-not (Test-Path (Join-Path $Kok ".next"))) {
    throw ".next yok — -AtlaBuild veremezsiniz, önce derlenmeli."
  }
} else {
  Adim "Bağımlılıklar (npm ci)"
  & npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci başarısız." }

  Adim "Prisma istemcisi"
  & npx prisma generate
  if ($LASTEXITCODE -ne 0) { throw "prisma generate başarısız." }

  Adim "Uygulama derleniyor"
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build başarısız." }
}

# ── 2) Node runtime ───────────────────────────────────────────────────
Adim "Node.js $NodeSurum gömülüyor"
$nodeKlasor = Join-Path $CiktiTam "node"
if (Test-Path (Join-Path $nodeKlasor "node.exe")) {
  Bilgi "Zaten gömülü — atlanıyor"
} else {
  $ad = "node-v$NodeSurum-win-x64"
  $zip = Join-Path $env:TEMP "$ad.zip"
  if (-not (Test-Path $zip)) {
    $url = "https://nodejs.org/dist/v$NodeSurum/$ad.zip"
    Bilgi "İndiriliyor: $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  } else {
    Bilgi "Önbellekten: $zip"
  }
  $gecici = Join-Path $env:TEMP "mp-node-$NodeSurum"
  if (Test-Path $gecici) { Remove-Item $gecici -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $gecici -Force
  New-Item -ItemType Directory -Force -Path $nodeKlasor | Out-Null
  Copy-Item (Join-Path $gecici "$ad\*") $nodeKlasor -Recurse -Force
  Remove-Item $gecici -Recurse -Force
  Bilgi "Gömüldü: $nodeKlasor"
}

# ── 3) Uygulama dosyaları ─────────────────────────────────────────────
Adim "Uygulama dosyaları toplanıyor"

# node/ hariç tutuluyor: az önce oraya Node'u koyduk, silmemeli.
Get-ChildItem $CiktiTam -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -ne "node" } |
  Remove-Item -Recurse -Force

# robocopy: büyük node_modules ağacında Copy-Item'dan belirgin hızlı ve
# uzun yol adlarında tökezlemiyor.
#
# `.next\dev` MUTLAKA hariç kalmalı: Turbopack'in dev sunucu önbelleği bu
# projede 20 GB'ı aşıyor ve üretimde hiçbir işe yaramıyor. Yalnız `cache`
# hariç tutulduğunda paket 25 GB çıkıyordu.
$haric = @(
  ".git", ".next\dev", ".next\cache", "dist-paket", "dist", "uploads",
  "node_modules\.cache", ".vscode", ".claude"
)
$argumanlar = @($Kok, $CiktiTam, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
foreach ($h in $haric) { $argumanlar += "/XD"; $argumanlar += (Join-Path $Kok $h) }
# /XF tam yol DEĞİL, çıplak desen ister; tam yol + joker verilince
# "Invalid Parameter" ile 16 döner. Çıplak desen ayrıca alt klasörlerdeki
# .env kopyalarını da dışladığı için istediğimiz şey zaten bu.
$argumanlar += @("/XF", ".env", "*.log")

# Diziyi splat (@) ile değil doğrudan geçiyoruz; @ ile geçince robocopy
# argümanları alamayıp 16 (ciddi hata) ile dönüyordu.
& robocopy $argumanlar | Out-Null
# robocopy 0-7 arası başarı, 8+ hata.
if ($LASTEXITCODE -ge 8) { throw "Dosya kopyalama başarısız (robocopy $LASTEXITCODE)." }
$global:LASTEXITCODE = 0

# .env ASLA pakete girmez: içinde bu makinenin SQL şifresi ve oturum
# anahtarı var. Müşteri kendi .env'ini kurulum sihirbazında üretir.
if (Test-Path (Join-Path $CiktiTam ".env")) {
  Remove-Item (Join-Path $CiktiTam ".env") -Force
  Write-Warning ".env pakete sizmisti, silindi."
}

$boyut = [math]::Round(
  ((Get-ChildItem $CiktiTam -Recurse -Force | Measure-Object Length -Sum).Sum / 1GB), 2)

Adim "Paket hazır"
Bilgi "Klasör : $CiktiTam"
Bilgi "Boyut  : $boyut GB (setup.exe sıkıştırılmış hâli belirgin küçük olur)"
Write-Host ""
Write-Host "    Sıradaki adım: Inno Setup ile derleyin" -ForegroundColor Yellow

# ISCC'nin yeri kuruluma göre değişiyor: winget onu kullanıcı klasörüne,
# klasik installer ise Program Files'a koyuyor. Sabit yol yazmak yerine
# bulup gösteriyoruz.
$isccAdaylar = @(
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
)
$iscc = $isccAdaylar | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($iscc) {
  Write-Host "      & `"$iscc`" scripts\setup.iss"
} else {
  Write-Host "      Inno Setup kurulu değil:" -ForegroundColor Yellow
  Write-Host "      winget install --id JRSoftware.InnoSetup"
}
