# MobilyumPro — Yönetim Paneli

Mobilya mağazası için yönetim paneli (admin) arayüzü.

## Teknolojiler

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (base-ui tabanlı bileşenler)
- **lucide-react** ikonlar, **sonner** bildirimleri

## Başlangıç

```bash
npm install
npm run dev      # http://localhost:1616
npm run build    # production derleme
```

## İkinci PC (test) kurulumu

Test makinesi kod'u GitHub üzerinden alır; **veritabanı her PC'de yereldir**
(kendi SQL Server + kendi `.env`). Güncellemeler `git push` (dev PC) →
`git pull` (test PC) ile akar. Node.js, Git ve SQL Server Express dahil hiçbir
şeyi elle kurmana gerek yok — `on-kosullar.ps1` hepsini yükler.

**İlk kurulum (test PC'de, bir kez):**

1. **Yönetici** PowerShell'de Git'i kur (repoyu klonlamak için tek satır):

   ```powershell
   winget install -e --id Git.Git
   ```

2. **Yeni** terminal aç, repoyu klonla:

   ```powershell
   git clone https://github.com/muharremoz/MobilyumPro.git
   cd MobilyumPro
   ```

   > Repo **private** olduğu için ilk `git clone`'da Git Credential Manager
   > bir tarayıcı açıp GitHub girişi ister (Git for Windows ile birlikte gelir).
   > Bir kez giriş yap; kimlik Windows'ta saklanır, sonraki `git pull`'lar
   > (yani `guncelle.ps1`) hiç sormadan çalışır. O makinede repoya erişebilen
   > bir GitHub hesabıyla giriş yapılmalı.

3. Ön koşulları kur (yönetici ister, kendini yükseltir):

   ```powershell
   .\on-kosullar.ps1
   ```

   Bu script: **Node.js LTS + Git + SQL Server 2022 Express**'i winget ile
   kurar; SQL'i ayarlar (mixed-mode auth + istediğin `sa` parolası + TCP 1433);
   `mobilyumpro` veritabanını oluşturur; `.env`'i parolayla doldurur.

4. **Yeni** terminal aç (Node/Git PATH'i tanınsın), uygulamayı kur ve başlat:

   ```powershell
   .\kurulum.ps1
   ```

   `npm install` → `db:generate` → `db:push` → `db:seed` yapıp
   `http://localhost:1616` adresinde başlatır.

**Her güncellemede (test PC'de):**

```powershell
.\guncelle.ps1
```

Çalışan dev'i durdurur → `git pull` → (değiştiyse) `npm install` ve Prisma
`generate` + `db push` → dev'i tekrar başlatır. Şema değişince örnek veri
`npm run db:seed` ile tazelenebilir.

> Not: Test PC'de kod düzenleme yapma; tek kaynak dev (bu) makinedir. Yerel
> değişiklik olursa `git pull` çakışır.
> `on-kosullar.ps1` yalnızca ilk kurulumda gerekir; sonraki güncellemeler için
> sadece `guncelle.ps1` yeterli.

## Sayfalar

| Yol           | Açıklama                                                     |
| ------------- | ----------------------------------------------------------- |
| `/`           | Genel bakış — özet kartları, haftalık satış, son siparişler |
| `/urunler`    | Ürün kataloğu — arama, kategori filtresi, yeni ürün dialog'u |
| `/siparisler` | Sipariş listesi — duruma göre filtreleme                    |
| `/stok`       | Stok takibi — kritik/tükenen uyarıları                      |
| `/musteriler` | Müşteri listesi                                             |
| `/ayarlar`    | Mağaza ayarları                                             |

## Yapı

```
src/
  app/(panel)/        # sidebar + üst bar içeren panel route group
  components/         # app-sidebar, user-menu, page-header, status-badge
  components/ui/      # shadcn/ui bileşenleri
  lib/data.ts         # örnek (mock) veri — gerçek API'ye bağlanacak
```

> Not: Veriler şimdilik `src/lib/data.ts` içindeki örnek verilerden gelir.
> Kaydetme/silme işlemleri demo amaçlıdır; backend bağlandığında gerçek hale getirilecektir.
