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
npm run dev      # http://localhost:3000
npm run build    # production derleme
```

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
