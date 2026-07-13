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
`git pull` (test PC) ile akar.

**Ön koşullar:** Node.js, Git, SQL Server (LocalDB/Express yeterli).

**İlk kurulum (test PC'de, bir kez):**

```powershell
git clone https://github.com/muharremoz/MobilyumPro.git
cd MobilyumPro
```

SQL Server'da `mobilyumpro` adında boş bir veritabanı oluştur (SSMS'de
`CREATE DATABASE mobilyumpro;` ya da Azure Data Studio). Sonra:

```powershell
.\kurulum.ps1
```

Script `.env`'i `.env.example`'dan oluşturur (ilk çalıştırmada Notepad'de
açılır — `{PAROLA}` yerine SQL Server `sa` parolanı yaz, kaydet, script'i
tekrar çalıştır). Ardından `npm install` → `db:generate` → `db:push` →
`db:seed` yapıp `http://localhost:1616` adresinde başlatır.

**Her güncellemede (test PC'de):**

```powershell
.\guncelle.ps1
```

Çalışan dev'i durdurur → `git pull` → (değiştiyse) `npm install` ve Prisma
`generate` + `db push` → dev'i tekrar başlatır. Şema değişince örnek veri
`npm run db:seed` ile tazelenebilir.

> Not: Test PC'de kod düzenleme yapma; tek kaynak dev (bu) makinedir. Yerel
> değişiklik olursa `git pull` çakışır.

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
