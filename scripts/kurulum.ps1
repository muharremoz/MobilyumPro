<#
.SYNOPSIS
  MobilyumPro'yu fabrika sunucusuna ilk kez kurar. (Adım 4)

.DESCRIPTION
  Sıfırdan kurulum: repo'yu çeker, .env oluşturur, bağımlılıkları kurar,
  veritabanını hazırlar, build alır, servisi ve gece görevini kaydeder.

  Betik yeniden çalıştırılabilir. Var olan bir kurulumun üstünde çalışırsa
  klasörü SİLMEZ, mevcut kurulumu günceller ve .env'i KORUR — kurulum
  betiğinin veri veya ayar kaybettirmesi kabul edilemez.

  Veritabanı iki durumda farklı davranır:
    • Boş DB      → `prisma migrate deploy` (şemayı kurar)
    • Verili DB   → `prisma migrate resolve --applied 0_init`
      (0_init'i "uygulanmış" işaretler, veriye DOKUNMAZ)
  Hangisi olduğunu betik kendi anlar; yanlış tarafa düşmemek için tabloların
  varlığına bakar.

.PARAMETER RepoUrl
  Private repo adresi. Token'ı URL'e gömmeyin; Deploy Key (SSH) veya
  Windows Credential Manager'da saklı PAT tercih edin.

.PARAMETER Hedef
  Kurulum klasörü. Varsayılan: C:\MobilyumPro

.PARAMETER Dal
  Çekilecek dal. Varsayılan: main

.PARAMETER Saat
  Gece güncelleme görevinin saati (HH:mm). Varsayılan: 02:00

.PARAMETER ServisKurma
  Servis ve gece görevi kurulumunu atlar (yalnız uygulamayı hazırlar).

.EXAMPLE
  # Yönetici PowerShell'de:
  .\kurulum.ps1 -RepoUrl "git@github.com:muharremoz/MobilyumPro.git"

.EXAMPLE
  .\kurulum.ps1 -RepoUrl "..." -Hedef "D:\MobilyumPro" -Saat 03:30
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$RepoUrl,
  [string]$Hedef = "C:\MobilyumPro",
  [string]$Dal = "main",
  [string]$Saat = "02:00",
  [switch]$ServisKurma
)

$ErrorActionPreference = "Stop"

function Adim($m) { Write-Host "`n=== $m" -ForegroundColor Cyan }
function Bilgi($m) { Write-Host "    $m" }

# ── Ön koşullar ───────────────────────────────────────────────────────
Adim "Ön koşullar denetleniyor"

$yonetici = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $yonetici -and -not $ServisKurma) {
  throw "Yönetici olarak çalıştırın (servis kaydı gerekir) ya da -ServisKurma verin."
}

foreach ($k in @("git", "node", "npm")) {
  $c = Get-Command "$k" -ErrorAction SilentlyContinue
  if (-not $c) {
    throw "$k bulunamadı. Node.js LTS ve Git kurulu olmalı: https://nodejs.org — https://git-scm.com"
  }
}
$nodeSurum = (& node --version).TrimStart("v")
if ([version]($nodeSurum -split "-")[0] -lt [version]"20.0.0") {
  throw "Node.js 20+ gerekli. Kurulu: $nodeSurum"
}
Bilgi "git, node $nodeSurum, npm hazır"

# ── Repo ──────────────────────────────────────────────────────────────
Adim "Kaynak kod"
if (Test-Path (Join-Path $Hedef ".git")) {
  Bilgi "Mevcut kurulum bulundu — güncelleniyor (klasör silinmez)"
  Push-Location $Hedef
  & git fetch --tags origin
  & git checkout $Dal
  & git pull --ff-only origin $Dal
  Pop-Location
} else {
  if ((Test-Path $Hedef) -and (Get-ChildItem $Hedef -Force | Measure-Object).Count -gt 0) {
    throw "$Hedef dolu ama git deposu değil. Farklı bir -Hedef verin veya klasörü elle boşaltın."
  }
  Bilgi "Klonlanıyor: $RepoUrl"
  & git clone --branch $Dal $RepoUrl $Hedef
}
Set-Location $Hedef

# ── .env ──────────────────────────────────────────────────────────────
Adim "Ortam dosyası (.env)"
$envYol = Join-Path $Hedef ".env"
if (Test-Path $envYol) {
  Bilgi ".env zaten var — KORUNUYOR (üzerine yazılmaz)"
} else {
  Copy-Item ".env.example" $envYol
  # Oturum anahtarı her kurulumda benzersiz olmalı; şablondaki boş değerle
  # bırakılırsa uygulama açılışta hata verir (bilinçli davranış).
  $rastgele = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 })) `
    -replace '\+', '-' -replace '/', '_' -replace '=', ''
  (Get-Content $envYol) -replace '^OTURUM_ANAHTARI=.*$', "OTURUM_ANAHTARI=$rastgele" |
    Set-Content $envYol -Encoding utf8
  Bilgi ".env oluşturuldu, OTURUM_ANAHTARI üretildi"
  Write-Warning "DATABASE_URL'i .env icinde duzenleyin, sonra bu betigi tekrar calistirin."
  Write-Host "    Dosya: $envYol"
  if (-not $env:DATABASE_URL) {
    Write-Host "`nDATABASE_URL ayarlanmadan devam edilemez. Duzenleyip tekrar calistirin." -ForegroundColor Yellow
    return
  }
}

# ── Bağımlılıklar ─────────────────────────────────────────────────────
Adim "Bağımlılıklar kuruluyor (npm ci)"
& npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci başarısız." }

Adim "Prisma istemcisi üretiliyor"
& npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate başarısız." }

# ── Veritabanı ────────────────────────────────────────────────────────
Adim "Veritabanı hazırlanıyor"
# Verili bir DB'ye migrate deploy çalıştırmak "tablo zaten var" hatası verir;
# boş bir DB'ye resolve çalıştırmak ise şemayı hiç kurmaz. Yanlış tarafa
# düşmemek için önce durumu okuyoruz.
$durum = (& npx prisma migrate status 2>&1 | Out-String)
$baselineGerekli = $durum -match "0_init" -and $durum -match "not yet been applied|have not yet been applied"

if ($baselineGerekli) {
  # Tablolar zaten duruyorsa (mevcut müşteri DB'si) baseline'ı uygulanmış say.
  Bilgi "0_init uygulanmamış görünüyor; tablo varlığı kontrol ediliyor"
  # Sayımı ayrı bir betik yapıyor: node -e ile satır içi JS geçirirken
  # tırnaklar argüman ayrıştırmasında bozuluyordu.
  $tabloSayisi = -1
  try { $tabloSayisi = [int](& node "scripts/db-tablo-sayisi.mjs") } catch { $tabloSayisi = -1 }

  if ($tabloSayisi -lt 0) {
    throw "Veritabanına bağlanılamadı. .env içindeki DATABASE_URL'i denetleyin."
  }
  if ($tabloSayisi -gt 1) {
    Bilgi "$tabloSayisi tablo bulundu → mevcut veri korunuyor (baseline işaretleniyor)"
    & npx prisma migrate resolve --applied 0_init
  } else {
    Bilgi "Boş veritabanı → şema kuruluyor"
    & npx prisma migrate deploy
  }
} else {
  Bilgi "Bekleyen migration uygulanıyor"
  & npx prisma migrate deploy
}
if ($LASTEXITCODE -ne 0) { throw "Veritabanı hazırlığı başarısız." }

# ── Build ─────────────────────────────────────────────────────────────
Adim "Uygulama derleniyor (npm run build)"
& npm run build
if ($LASTEXITCODE -ne 0) { throw "Build başarısız." }

# ── Servis + gece görevi ──────────────────────────────────────────────
if ($ServisKurma) {
  Bilgi "Servis kurulumu atlandı (-ServisKurma)"
} else {
  Adim "Servis ve gece görevi"
  & (Join-Path $Hedef "scripts\servis-kur.ps1") -Saat $Saat
}

Adim "Kurulum tamamlandı"
Write-Host "    Uygulama : http://localhost:1616"
Write-Host "    Klasör   : $Hedef"
Write-Host ""
Write-Host "    Yapılacaklar:" -ForegroundColor Yellow
Write-Host "      1. .env icinde GUNCELLE_RESTART_KOMUT'u yukarida yazan degerle doldurun."
Write-Host "      2. GUNCELLE_DB_YEDEK_KOMUT'u doldurun (migrate oncesi DB yedegi)."
Write-Host "      3. Ayarlar > Yazilim Guncelleme ekranindan modu secin."
Write-Host "      4. Ilk kullanici yoksa yonetici hesabini olusturun."
