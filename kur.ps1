# ============================================================================
#  MobilyumPro - Test PC TEK ADIM kurulum
#  Kullanim: proje klasorunde ->  .\kur.ps1   (yonetici ister, kendini yukseltir)
#  Yaptigi (bastan sona, tek script):
#    1) winget ile Node.js LTS + Git + SQL Server 2022 Express kurar
#    2) Ayni oturumda PATH'i tazeler (yeni terminal gerekmez)
#    3) SQL'i ayarlar: mixed-mode auth + 'sa' parolasi + TCP 1433
#    4) 'mobilyumpro' veritabanini olusturur
#    5) .env'i parolayla yazar
#    6) npm install + prisma generate/push + seed
#    7) uygulamayi baslatir: http://localhost:1616
#  Sonraki guncellemeler icin sadece:  .\guncelle.ps1
# ============================================================================
$ErrorActionPreference = "Stop"

# --- Yonetici degilsek kendimizi yukselt -----------------------------------
$admin = ([Security.Principal.WindowsPrincipal] `
  [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Write-Host "Yonetici izni gerekiyor, yeniden baslatiliyor..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList `
    "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

Set-Location $PSScriptRoot
Write-Host "=== MobilyumPro tek adim kurulum ===" -ForegroundColor Cyan

# Native komut hatalarini yakalayan yardimci
function Calistir($aciklama, [scriptblock]$blok) {
  Write-Host "==> $aciklama" -ForegroundColor Cyan
  & $blok
  if ($LASTEXITCODE -ne 0) {
    Write-Host "!! Adim basarisiz oldu: $aciklama (kod $LASTEXITCODE)" -ForegroundColor Red
    exit 1
  }
}

# --- 1) winget ile paketler -------------------------------------------------
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "!! winget bulunamadi. Windows 10/11 'App Installer' guncel olmali." -ForegroundColor Red
  exit 1
}
function Winget-Kur($id, $ad) {
  Write-Host "==> $ad kuruluyor ($id)..." -ForegroundColor Cyan
  winget install -e --id $id --accept-package-agreements --accept-source-agreements --silent
  # zaten kuruluysa cikis kodu 0 disi olabilir; hata sayma
}
Winget-Kur "OpenJS.NodeJS.LTS" "Node.js LTS"
Winget-Kur "Git.Git" "Git"
Winget-Kur "Microsoft.SQLServer.2022.Express" "SQL Server 2022 Express"

# --- 2) Bu oturumda PATH'i tazele (node/npm/git hemen taninsin) -------------
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

# --- 3) SQL 'sa' parolasini iste -------------------------------------------
Write-Host ""
Write-Host "SQL Server 'sa' hesabi icin bir parola belirle." -ForegroundColor Yellow
Write-Host "(En az 8 karakter; buyuk/kucuk harf + rakam icermeli.)" -ForegroundColor DarkGray
$sec = Read-Host "sa parolasi" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$saPwd = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if ([string]::IsNullOrWhiteSpace($saPwd)) {
  Write-Host "!! Bos parola kabul edilmez." -ForegroundColor Red
  exit 1
}

# --- 4) SQL Express'i ayarla (mixed mode + TCP 1433) ------------------------
$svc = "MSSQL`$SQLEXPRESS"
$s = Get-Service $svc -ErrorAction SilentlyContinue
if (-not $s) {
  Write-Host "!! $svc servisi bulunamadi. SQL Express kurulumu tamamlanmamis olabilir." -ForegroundColor Red
  exit 1
}
if ($s.Status -ne "Running") { Start-Service $svc }

$instId = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL").SQLEXPRESS
$base = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instId\MSSQLServer"

Write-Host "==> Mixed-mode auth aciliyor (LoginMode=2)..." -ForegroundColor Cyan
Set-ItemProperty -Path $base -Name "LoginMode" -Value 2 -Type DWord

Write-Host "==> TCP/IP aciliyor, port 1433 sabitleniyor..." -ForegroundColor Cyan
$tcp = "$base\SuperSocketNetLib\Tcp"
Set-ItemProperty -Path $tcp -Name "Enabled" -Value 1 -Type DWord
Set-ItemProperty -Path "$tcp\IPAll" -Name "TcpPort" -Value "1433" -Type String
Set-ItemProperty -Path "$tcp\IPAll" -Name "TcpDynamicPorts" -Value "" -Type String

Write-Host "==> SQL Server yeniden baslatiliyor..." -ForegroundColor Cyan
Restart-Service $svc -Force
Start-Sleep -Seconds 3

Add-Type -AssemblyName System.Data
function Invoke-Sql($server, $query) {
  $cs = "Server=$server;Integrated Security=true;TrustServerCertificate=true;Encrypt=true"
  $conn = New-Object System.Data.SqlClient.SqlConnection $cs
  $conn.Open()
  try {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $query; [void]$cmd.ExecuteNonQuery()
  } finally { $conn.Close() }
}

Write-Host "==> 'sa' etkinlestiriliyor ve parola atanıyor..." -ForegroundColor Cyan
$saPwdSql = $saPwd.Replace("'", "''")
try {
  Invoke-Sql "localhost\SQLEXPRESS" `
    "ALTER LOGIN [sa] ENABLE; ALTER LOGIN [sa] WITH PASSWORD = N'$saPwdSql';"
} catch {
  Write-Host "!! 'sa' ayarlanamadi: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "   Parola SQL politikasina uymuyor olabilir (daha guclu bir parola dene)." -ForegroundColor Red
  exit 1
}

Write-Host "==> 'mobilyumpro' veritabani olusturuluyor (varsa dokunulmaz)..." -ForegroundColor Cyan
Invoke-Sql "localhost\SQLEXPRESS" "IF DB_ID('mobilyumpro') IS NULL CREATE DATABASE [mobilyumpro];"

# --- 5) .env yaz ------------------------------------------------------------
if (Test-Path ".env") {
  Write-Host "==> .env zaten var; uzerine yazilmadi." -ForegroundColor DarkGray
} else {
  Write-Host "==> .env yaziliyor..." -ForegroundColor Cyan
  $tpl = Get-Content ".env.example" -Raw
  $envContent = $tpl.Replace("{PAROLA}", "{$saPwd}")
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), $envContent)
}

# --- 6) Uygulama bagimliliklari + veritabani semasi + ornek veri ------------
Calistir "npm install..." { npm install }
Calistir "Prisma generate..." { npm run db:generate }
Calistir "Veritabani semasi (db push)..." { npx prisma db push }
Calistir "Ornek veri (seed)..." { npm run db:seed }

# --- 7) Baslat --------------------------------------------------------------
Write-Host ""
Write-Host "=== Kurulum tamam. Baslatiliyor: http://localhost:1616 ===" -ForegroundColor Green
Write-Host "Sonraki guncellemeler icin: .\guncelle.ps1" -ForegroundColor DarkGray
npm run dev
