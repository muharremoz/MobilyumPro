; MobilyumPro kurulum paketi (Inno Setup 6)
;
; Derleme:
;   1. .\scripts\paket-hazirla.ps1        -> dist-paket\ hazirlar
;   2. ISCC.exe scripts\setup.iss         -> dist\MobilyumPro-Setup-x.y.z.exe
;
; Kurulum sonrasi kullanici tarayicida http://localhost:1616 adresinde
; 4 adimli kurulum sihirbaziyla karsilasir (SQL / yonetici / lisans / ozet).
; SQL Server bu paketin icinde DEGILDIR - onkosuldur.

#define Uygulama "MobilyumPro"
#define Surum "0.1.0"
#define Yayinci "Pusulanet"
#define Port "1616"

[Setup]
AppId={{8F3C1A22-4E7B-4C55-9A1D-7B2E5D6F0C31}
AppName={#Uygulama}
AppVersion={#Surum}
AppPublisher={#Yayinci}
DefaultDirName=C:\{#Uygulama}
; Program Files DEGIL: uygulama kendi klasorune .env, log ve yuklenen
; dosyalari yaziyor. Program Files altinda her yazma yukseltme isterdi.
DisableDirPage=no
DefaultGroupName={#Uygulama}
OutputDir=..\dist
OutputBaseFilename={#Uygulama}-Setup-{#Surum}
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Servis kaydi ve zamanlanmis gorev yonetici hakki ister.
PrivilegesRequired=admin
WizardStyle=modern
UninstallDisplayName={#Uygulama}
; Kurulum sirasinda calisan surumu durdurabilmek icin.
CloseApplications=yes

[Languages]
Name: "tr"; MessagesFile: "compiler:Languages\Turkish.isl"

[Files]
; dist-paket\ icerigi: uygulama + node_modules + gomulu node runtime.
Source: "..\dist-paket\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#Uygulama}"; Filename: "http://localhost:{#Port}"
Name: "{group}\{#Uygulama} Kaldir"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#Uygulama}"; Filename: "http://localhost:{#Port}"; Tasks: masaustu

[Tasks]
Name: "masaustu"; Description: "Masaustu kisayolu olustur"; GroupDescription: "Kisayollar:"

[Run]
; Servis + gece guncelleme gorevi. Gomulu node kullanilir; makinede Node
; kurulu olmasi gerekmez.
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\servis-kur.ps1"" -NodeKlasoru ""{app}\node"""; \
  StatusMsg: "Windows servisi kaydediliyor..."; Flags: runhidden waituntilterminated

; Sunucunun ayaga kalkmasi birkac saniye suruyor; tarayici hemen acilirsa
; bos sayfa gorunur. Kullaniciyi "kurulum bozuk" sanmaktan kurtarmak icin
; bekleyip oyle aciyoruz.
Filename: "{app}\node\node.exe"; \
  Parameters: "-e ""setTimeout(()=>{{}},12000)"""; \
  StatusMsg: "Uygulama baslatiliyor..."; Flags: runhidden waituntilterminated

Filename: "http://localhost:{#Port}"; \
  Description: "MobilyumPro'yu ac ve kuruluma basla"; \
  Flags: postinstall shellexec nowait

[UninstallRun]
; Servis ve gorevler once kaldirilir, yoksa dosyalar kilitli kalir.
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\servis-kur.ps1"" -Kaldir"; \
  Flags: runhidden waituntilterminated; RunOnceId: "ServisKaldir"

[UninstallDelete]
; Kurulumda uretilen, pakette olmayan dosyalar.
Type: files; Name: "{app}\sunucu.log"
Type: files; Name: "{app}\guncelle.log"
Type: filesandordirs; Name: "{app}\.next\cache"

[Code]
{ SQL Server onkosul denetimi.

  Bulunamazsa kurulumu DURDURMUYORUZ: SQL baska bir makinede olabilir ve
  kurulum sihirbazi zaten uzak sunucu adresi soruyor. Yalniz uyariyoruz -
  yanlis bir varsayimla kurulumu engellemek, dogru kurulumlari da keserdi. }
function SqlServerVarMi(): Boolean;
var
  Isimler: TArrayOfString;
begin
  Result := RegGetSubkeyNames(HKLM, 'SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL', Isimler)
            and (GetArrayLength(Isimler) > 0);
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if not SqlServerVarMi() then
  begin
    if MsgBox('Bu makinede SQL Server bulunamadi.'#13#10#13#10 +
              'MobilyumPro verilerini SQL Server uzerinde tutar. Veritabani ' +
              'baska bir sunucudaysa sorun yok; kurulum sihirbazinda o sunucunun ' +
              'adresini gireceksiniz.'#13#10#13#10 +
              'Kuruluma devam edilsin mi?',
              mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;

{ Guncellemede .env korunur: icinde musterinin SQL sifresi ve oturum
  anahtari var. Silinirse tum oturumlar duser ve kurulum sihirbazi
  bastan acilir. }
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    if FileExists(ExpandConstant('{app}\.env')) then
      MsgBox('Ayar dosyaniz korundu:'#13#10 +
             ExpandConstant('{app}\.env') + #13#10#13#10 +
             'Veritabaniniz da silinmedi. Ikisini de kaldirmak isterseniz ' +
             'elle silmeniz gerekir.', mbInformation, MB_OK);
  end;
end;
