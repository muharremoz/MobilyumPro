<#
.SYNOPSIS
  Çalışan MobilyumPro sunucusunu durdurur.

.DESCRIPTION
  Hem kaldırma hem güncelleme öncesinde çağrılır. Var olma sebebi somut bir
  hata: görevi `Unregister-ScheduledTask` ile silmek, o görevin BAŞLATTIĞI
  node sürecini öldürmüyor. Süreç ayakta kaldığı için 1616 portu ve
  kurulum klasöründeki dosyalar kilitli kalıyordu; kaldırma klasörü
  silemiyor, üzerine kurulum ise "dosya kullanımda" ile (Inno çıkış 5)
  başarısız oluyordu.

  Görev durdurulur, sonra kurulum klasöründen çalışan node süreçleri
  kapatılır. Yalnız BU klasörden çalışanlar hedeflenir — makinedeki başka
  Node uygulamalarını öldürmek kabul edilemez.

.PARAMETER Kok
  Kurulum klasörü. Verilmezse betiğin bulunduğu yerin üstü kullanılır.

.PARAMETER ServisAdi
  Servis / görev adı öneki. Varsayılan: MobilyumPro
#>
[CmdletBinding()]
param(
  [string]$Kok = "",
  [string]$ServisAdi = "MobilyumPro"
)

# Durdurma "en iyi çaba"dır: bir adım tökezlese de diğerleri denenmeli,
# yoksa kaldırma yarıda kalır. Bu yüzden Stop DEĞİL Continue.
$ErrorActionPreference = "Continue"

if (-not $Kok) { $Kok = Split-Path -Parent $PSScriptRoot }
Write-Host "Durduruluyor: $Kok"

# 1) Zamanlanmış görev
foreach ($g in @("$ServisAdi-Sunucu", "$ServisAdi-Guncelleme")) {
  $t = Get-ScheduledTask -TaskName $g -ErrorAction SilentlyContinue
  if ($t) {
    Stop-ScheduledTask -TaskName $g -ErrorAction SilentlyContinue
    Write-Host "  görev durduruldu: $g"
  }
}

# 2) NSSM servisi (varsa)
$svc = Get-Service -Name $ServisAdi -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne "Stopped") {
  Stop-Service -Name $ServisAdi -Force -ErrorAction SilentlyContinue
  Write-Host "  servis durduruldu: $ServisAdi"
}

# 3) Bu klasörden çalışan node süreçleri
#    ExecutablePath gömülü node'u ($Kok\node\node.exe), CommandLine ise
#    PATH'teki Node ile başlatılmış olabilecek durumu yakalar.
$kokDesen = $Kok.TrimEnd('\') + '\*'
$sayac = 0
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    ($_.ExecutablePath -like $kokDesen) -or ($_.CommandLine -like $kokDesen)
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    $sayac++
  }
if ($sayac -gt 0) { Write-Host "  $sayac node süreci kapatıldı" }

# Dosya tutamaklarının bırakılması bir an sürüyor; hemen ardından gelen
# dosya silme/kopyalama işlemi buna takılmasın.
Start-Sleep -Seconds 2
Write-Host "Durdurma tamamlandı."
