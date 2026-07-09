# Evde Devam — Pull Sonrası Yapılacaklar

Bu dosya, **evdeki bilgisayarda** repoyu çektikten sonra projeyi çalışır hale
getirmek için gereken adımları içerir. Veritabanı **paylaşılmaz** — her makine
kendi yerel SQL Server'ında çalışır; bu yüzden şema değişikliklerini pull sonrası
elle uygulamak gerekir.

> Son iş PC'sindeki commit: `71f3dce` (birleşik stok kartı modülü).

---

## 1. Kodu çek

```powershell
cd "<PROJE_YOLU>\MobilyumPro"
git pull
```

## 2. Bağımlılıkları güncelle

Bu oturumda yeni npm paketi **eklenmedi**, ama garanti olsun diye:

```powershell
npm install
```

## 3. Şemayı DB'ye uygula + Prisma client üret

**Bu adım şart** — bu oturumda çok sayıda yeni tablo ve kolon eklendi.

```powershell
# Dev server AÇIKSA önce durdur (generate dosya kilidine takılır)
npx prisma db push
npx prisma generate
```

- Bu oturumdaki değişiklikler **kolon düşürmüyor**, yani `--accept-data-loss`
  gerekmez. (İstisna: iş PC'sinde bir ara `malzeme.tip` kolonu düşmüştü —
  evdeki DB'de o kolon hâlâ varsa `npx prisma db push --accept-data-loss`
  çalıştır; `tip` verisi zaten kullanılmıyordu.)
- `prisma generate` "EPERM / dosya kilidi" hatası verirse dev server'ı durdurup
  tekrar çalıştır.

## 4. (Gerekirse) mock veriyi temizle

Projede artık mock veri yok. Evdeki DB'de **eski mock kayıtlar** (10 ürün,
12 cari vb.) hâlâ duruyorsa temizlemek için:

```powershell
npm run db:seed   # iş tablolarını boşaltır (kullanıcı/rol/yetki/parametre/kolon ayarı KORUNUR)
```

Boş başlamak istemiyorsan bu adımı atla — eski kayıtlar dursun, sorun olmaz.

## 5. Çalıştır

```powershell
npm run dev        # http://localhost:1616
```

---

## Bu oturumda eklenen YENİ TABLOLAR (db push bunları oluşturur)

| Tablo | Ne için |
| --- | --- |
| `grup` | Tanımlamalar → Gruplar (ağaç yapılı stok grubu) |
| `tanim` | Marka/Koleksiyon/Renk/Kumaş/Birim + Ülke/Bölge/Şehir/Semt |
| `cari_banka`, `cari_sube`, `cari_yetkili`, `cari_crm`, `cari_dokuman` | Cari kartı alt sekmeleri |
| `alis`, `alis_satiri` | Satın alma (tedarikçiden malzeme alışı) |
| `stok`, `stok_uretici`, `stok_musteri`, `stok_dokuman` | Birleşik stok kartı |

Ayrıca `cari` ve `malzeme` tablolarına yeni **kolonlar** eklendi
(cari: tamAd, yetkili*, telefon2/3, fax, webSite, satisFiyatTipi, iskontoOrani,
temsilci, sube, muhasebeKodu, tcKimlik, unvan, ulke/bolge/semt, audit; malzeme:
`grup` — `tip` yerine).

---

## Bu oturumda NELER YAPILDI (özet)

- **Mock veri tamamen kaldırıldı**; `db:seed` artık boş başlangıç yapıyor.
- **Genel Bakış** sayfası boşaltıldı (içerik sonra tasarlanacak).
- **Tanımlamalar → Gruplar**: ağaç yapılı stok grubu (grup → alt grup → …),
  kodlar elle (150/152 muhasebe kodu, 01 sıra, AKS kısaltma). Kod mantığı için
  başlıkta ℹ️ bilgi popover'ı.
- **Düz tanımlar DB'ye bağlandı** (Marka/Renk/Kumaş/Birim); ürün formunda Kategori
  → ağaçlı **Grup seçici**, Renk/Kumaş/Marka tanımlardan seçilir.
- **Malzemede `tip` kaldırıldı → `grup`** (stok grup ağacından); tedarikçi cari
  kartlardan seçilir.
- **Cari kartı** tam sayfa çok sekmeli oldu: Genel/İletişim/Satış & Muhasebe +
  Fatura + Adres (Ülke/Şehir/Semt combobox, yeni ekle), Yetkili kartı, Banka /
  Şubeler / Yetkililer / CRM / Dokümanlar (PC'den dosya yükleme). Kod otomatik
  (düz rakam, salt-okunur).
- **Satın Alma modülü**: tedarikçiden malzeme alışı → tek işlemde stok girişi +
  stok hareketi + cariye Alacak (bakiye).
- **Birleşik Stok Kartı modülü**: Hammadde/Yarı Mamül/Mamül/Hizmet tek kartta;
  malzeme/model **ayna senkronu** ile eski akışlar bozulmadan çalışır. Reçete
  havuzdan seçilir, rota şimdilik sabit fabrika rotası.
- **Dosya yükleme altyapısı**: `POST /api/dosya` → `uploads/` (git'e girmez),
  `GET /api/dosya/...` servis eder. Cari ve stok dokümanları bunu kullanır.

## Bekleyen işler (evde devam)

1. **Parametrik alanlar motoru** (her tabloya takılabilir özel alanlar: String/
   Int/Double/List/MultiList/Date/Bool; zorunluluk + kaynak liste) — ayrı faz.
2. Eski **Modeller / Malzemeler** ekranlarını stok kartına yönlendirip emekliye
   ayırma.
3. **Rota tanımları** (şimdilik tüm üretim tek sabit fabrika rotasını izliyor).
4. Gerçek **oturum/login** altyapısı — tüm `TODO: oturum` işaretleri (yönetici
   rolü, mevcutKullaniciId, audit user id'leri).

---

### Notlar
- `.env` git'e girmez — evdeki makinede kendi `sa` şifrenle kurulu olmalı
  (bkz. `SETUP.md`).
- `uploads/` klasörü git'e girmez; yüklenen dosyalar makineye özeldir.
- Bir sorun çıkarsa `npx tsc --noEmit` ilk başvuru; hepsi bu oturumda EXIT=0'dı.
