<#
.SYNOPSIS
  MobilyumPro'yu fabrika sunucusunda otomatik başlayacak hale getirir ve
  gece güncelleme görevini kaydeder. (Adım 3)

.DESCRIPTION
  İki şey kurar:
    1. Uygulama — makine açılınca kendiliğinden kalkar, çökerse geri gelir.
    2. Gece görevi — her gün belirlenen saatte guncelle-zamanli.mjs çalışır.
       O betik "güncelleme modu otomatik değilse" hiçbir şey yapmaz; yani
       görevi kurmak tek başına otomatik güncelleme AÇMAZ.

  Uygulama için iki yol var:
    • NSSM bulunursa gerçek bir Windows servisi kurulur (çökünce otomatik
      yeniden başlatma NSSM'in işi — tercih edilen yol).
    • Bulunmazsa "sistem açılışında" çalışan bir Zamanlanmış Görev kurulur.
      Dış bağımlılık gerektirmez; Windows'ta hazır gelir. NSSM'i zorunlu
      tutmak, tek bir exe için kurulumu tıkamak olurdu.

  Betik yeniden çalıştırılabilir: var olan servis/görev güncellenir.

.PARAMETER Saat
  Gece görevinin saati (HH:mm). Uygulamadaki "guncelleme_saat" ayarıyla
  AYNI olmalı — görevi asıl tetikleyen Windows, uygulama değil.

.PARAMETER ServisAdi
  Servis / görev adı öneki. Varsayılan: MobilyumPro

.PARAMETER NssmYolu
  nssm.exe yolu. Verilmezse PATH'te aranır, yoksa görev yoluna düşülür.

.PARAMETER NodeKlasoru
  Gömülü Node klasörü (node.exe + npm.cmd). Verilmezse önce kurulum
  içindeki `node\` klasörüne, o da yoksa PATH'e bakılır.

.PARAMETER Kaldir
  Kurulan servis ve görevleri siler.

.EXAMPLE
  # Yönetici PowerShell'de, proje kökünde:
  .\scripts\servis-kur.ps1 -Saat 02:00

.EXAMPLE
  .\scripts\servis-kur.ps1 -Kaldir
#>
[CmdletBinding()]
param(
  [string]$Saat = "02:00",
  [string]$ServisAdi = "MobilyumPro",
  [string]$NssmYolu = "",
  [string]$NodeKlasoru = "",
  [switch]$Kaldir
)

$ErrorActionPreference = "Stop"

# ── Ön kontroller ─────────────────────────────────────────────────────
$yonetici = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $yonetici) {
  throw "Bu betik YÖNETİCİ olarak çalıştırılmalı (servis/görev kaydı gerektirir)."
}

# Proje kökü: bu betik scripts/ altında duruyor.
$Kok = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Kok "package.json"))) {
  throw "Proje kökü bulunamadı: $Kok"
}

$GorevSunucu = "$ServisAdi-Sunucu"
$GorevGece = "$ServisAdi-Guncelleme"

function Gorev-Var($ad) {
  $null -ne (Get-ScheduledTask -TaskName $ad -ErrorAction SilentlyContinue)
}

# ── Kaldırma ──────────────────────────────────────────────────────────
if ($Kaldir) {
  foreach ($g in @($GorevSunucu, $GorevGece)) {
    if (Gorev-Var $g) {
      Unregister-ScheduledTask -TaskName $g -Confirm:$false
      Write-Host "Görev silindi: $g"
    }
  }
  $svc = Get-Service -Name $ServisAdi -ErrorAction SilentlyContinue
  if ($svc) {
    $nssm = if ($NssmYolu) { $NssmYolu } else { (Get-Command nssm -ErrorAction SilentlyContinue).Source }
    if ($nssm) {
      & $nssm stop $ServisAdi 2>$null
      & $nssm remove $ServisAdi confirm
      Write-Host "Servis silindi: $ServisAdi"
    } else {
      Write-Warning "Servis var ama nssm bulunamadı; elle kaldırın: sc.exe delete $ServisAdi"
    }
  }
  Write-Host "Kaldırma tamamlandı."
  return
}

# ── Saat doğrulaması ──────────────────────────────────────────────────
# Geçersiz saat sessizce 00:00'a düşerse gece görevi yanlış zamanda çalışır.
$zaman = [datetime]::MinValue
# "3:30" de kabul edilir; tek biçim dayatmak gereksiz sürtünme olurdu.
$bicimler = [string[]]@("HH:mm", "H:mm")
if (-not [datetime]::TryParseExact($Saat, $bicimler, $null, "None", [ref]$zaman)) {
  throw "Saat biçimi HH:mm olmalı (örn. 02:00 veya 2:00). Verilen: $Saat"
}

# Node çalıştırıcıları: önce kuruluma gömülü kopya (setup.exe böyle kurar),
# yoksa PATH. Gömülü kopyayı öne almak, müşteri makinesinde Node kurulu
# olmasa da servisin ayakta kalmasını sağlar.
if (-not $NodeKlasoru) { $NodeKlasoru = Join-Path $Kok "node" }
$gomuluNpm = Join-Path $NodeKlasoru "npm.cmd"
$gomuluNode = Join-Path $NodeKlasoru "node.exe"

if ((Test-Path $gomuluNpm) -and (Test-Path $gomuluNode)) {
  $npm = $gomuluNpm
  $node = $gomuluNode
  Write-Host "Gömülü Node kullanılıyor: $NodeKlasoru"
} else {
  $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npm) { throw "npm bulunamadı — Node.js kurulu mu?" }
  $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if (-not $node) { throw "node bulunamadı — Node.js kurulu mu?" }
}

Write-Host "Proje kökü : $Kok"
Write-Host "Gece saati : $Saat"

# ── 1) Uygulamayı otomatik başlat ─────────────────────────────────────
$nssm = if ($NssmYolu) { $NssmYolu } else { (Get-Command nssm -ErrorAction SilentlyContinue).Source }
$restartKomut = ""

if ($nssm) {
  Write-Host "`nNSSM bulundu: $nssm — Windows servisi kuruluyor..."
  $varOlan = Get-Service -Name $ServisAdi -ErrorAction SilentlyContinue
  if ($varOlan) {
    & $nssm stop $ServisAdi 2>$null
  } else {
    & $nssm install $ServisAdi $npm "run" "start"
  }
  # Yeniden çalıştırmada da ayarlar güncellensin (idempotent).
  & $nssm set $ServisAdi AppDirectory $Kok
  & $nssm set $ServisAdi AppStdout (Join-Path $Kok "sunucu.log")
  & $nssm set $ServisAdi AppStderr (Join-Path $Kok "sunucu.log")
  & $nssm set $ServisAdi AppRotateFiles 1
  & $nssm set $ServisAdi Start SERVICE_AUTO_START
  & $nssm start $ServisAdi
  $restartKomut = "nssm restart $ServisAdi"
  Write-Host "Servis kuruldu ve başlatıldı: $ServisAdi"
} else {
  Write-Host "`nNSSM yok — sistem açılışında çalışan Zamanlanmış Görev kuruluyor..."
  # SYSTEM hesabı: kimse oturum açmasa da uygulama ayakta kalsın.
  $eylem = New-ScheduledTaskAction -Execute $npm -Argument "run start" -WorkingDirectory $Kok
  $tetik = New-ScheduledTaskTrigger -AtStartup
  $ayar = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)   # süresiz: sunucu sürekli çalışır
  $asKim = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

  if (Gorev-Var $GorevSunucu) { Unregister-ScheduledTask -TaskName $GorevSunucu -Confirm:$false }
  Register-ScheduledTask -TaskName $GorevSunucu -Action $eylem -Trigger $tetik `
    -Settings $ayar -Principal $asKim | Out-Null
  Start-ScheduledTask -TaskName $GorevSunucu
  $restartKomut = "schtasks /End /TN $GorevSunucu & schtasks /Run /TN $GorevSunucu"
  Write-Host "Görev kuruldu ve başlatıldı: $GorevSunucu"
  Write-Host "NOT: Gerçek servis davranışı (çökünce anında dönüş, servis yönetimi)"
  Write-Host "     için NSSM kurup bu betiği yeniden çalıştırabilirsiniz."
}

# ── 2) Gece güncelleme görevi ─────────────────────────────────────────
# guncelle-zamanli.mjs modu DB'den okur; mod "otomatik" değilse dokunmaz.
# Yani bu görevi kurmak otomatik güncellemeyi AÇMAZ, yalnız mümkün kılar.
$geceEylem = New-ScheduledTaskAction -Execute $node `
  -Argument "scripts/guncelle-zamanli.mjs" -WorkingDirectory $Kok
$geceTetik = New-ScheduledTaskTrigger -Daily -At $zaman
$geceAyar = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$geceKim = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

if (Gorev-Var $GorevGece) { Unregister-ScheduledTask -TaskName $GorevGece -Confirm:$false }
Register-ScheduledTask -TaskName $GorevGece -Action $geceEylem -Trigger $geceTetik `
  -Settings $geceAyar -Principal $geceKim | Out-Null
Write-Host "Gece görevi kuruldu: $GorevGece ($Saat)"

# ── Sonuç ─────────────────────────────────────────────────────────────
Write-Host "`n─────────────────────────────────────────────"
Write-Host "Kurulum tamam. .env dosyasına şu satırı ekleyin:"
Write-Host ""
Write-Host "  GUNCELLE_RESTART_KOMUT=$restartKomut"
Write-Host ""
Write-Host "Ayrıca GUNCELLE_DB_YEDEK_KOMUT'u mutlaka doldurun — migrate"
Write-Host "uygulandıktan sonra şema geri alınamaz, veriyi yalnız o yedek kurtarır."
Write-Host ""
Write-Host "Uygulama: http://localhost:1616"
Write-Host "Ayarlar → Yazılım Güncelleme ekranından modu ve saati seçin."
Write-Host "Gece görevi saati burada sabit: değiştirmek için bu betiği"
Write-Host "-Saat YENİ_SAAT ile yeniden çalıştırın."
Write-Host "─────────────────────────────────────────────"
