# ============================================================================
#  MobilyumPro - Masaustune kisayol olustur (test PC'de bir kez calistir)
#  Masaustune "MobilyumPro" kisayolu koyar; cift tiklayinca baslat.ps1 calisir
#  (sunucu kapaliysa baslatir, sonra tarayiciyi acar).
# ============================================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$hedefBaslat = Join-Path $PSScriptRoot "baslat.ps1"
$ikon = Join-Path $PSScriptRoot "src\app\favicon.ico"
$masaustu = [Environment]::GetFolderPath("Desktop")
$lnkYolu = Join-Path $masaustu "MobilyumPro.lnk"

$ws = New-Object -ComObject WScript.Shell
$k = $ws.CreateShortcut($lnkYolu)
$k.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$k.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$hedefBaslat`""
$k.WorkingDirectory = $PSScriptRoot
if (Test-Path $ikon) { $k.IconLocation = $ikon }
$k.Description = "MobilyumPro'yu baslat ve tarayicida ac"
$k.Save()

Write-Host "Masaustune kisayol olusturuldu: $lnkYolu" -ForegroundColor Green
Write-Host "Artik cift tiklayarak uygulamayi acabilirsin." -ForegroundColor DarkGray
