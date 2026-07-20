<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Proje standartları

## DB'yi makineler arası taşıma (ev ↔ ofis)

Veri git ile taşınır: `prisma/veri/snapshot.json`.

- **Bırakmadan önce:** `npm run db:yedek` → snapshot'ı tazeler, sonra commit + push.
- **Devralırken:** `git pull` → `npx prisma db push` (şema) → `npm run db:geri-yukle`.

`db:geri-yukle` snapshot'taki tabloları **önce siler, sonra yükler** — birleştirmez;
iki makinede aynı veri olsun diyedir. Yerelde kaydetmediğin bir şey varsa önce
`db:yedek` al. Tablo listesi `scripts/db-tablolar.mjs`'de; yeni tablo eklenince
oraya da yazılmalı (IDENTITY id'li tablolar ayrıca `IDENTITY_TABLOLAR`'a).

### Boşaltma koruması

`db:yedek`, snapshot'ta **dolu** olan bir tablo DB'de **boş**sa yedek almaz ve
1 ile çıkar. Sebep gerçek bir kayıp: `db:geri-yukle` çalıştırmadan `db:yedek`
alınırsa karşı makinenin verisi sessizce snapshot'tan düşer ve kayıp git ile
geri taşınır — `f37f9da` (bir satın alma özelliği; mesajında veriden söz yok)
LOREN üretim zincirini böyle silmişti, 4 yedek commit'i boyunca fark edilmedi.

Koruma yalnız **tamamen boşalmayı** engeller; satır sayısının azalması normaldir
(kayıt silmiş olabilirsin) ve engellenmez. Boşaltma kasıtlıysa:

```
npm run db:yedek -- --zorla
```

## Silme kuralı: işlem görmüş kayıt silinmez

Silme action'ı **doğrudan `delete` çağırmaz** — önce `src/lib/db/silme-kontrol.ts`
içindeki ilgili `*SilinebilirMi()` fonksiyonu çalışır:

```ts
const on = await silmeOnKontrol(ids, stokSilinebilirMi); // toplu
if (!on.ok) return { ok: false, error: on.error };
```

FK'ya güvenmek YETMEZ: stok hareketi (`ref_id`), üretim emri (`model_id`) ve
ad ile bağlanan tanımlar (cins/marka/renk/birim/depo) FK'sızdır — bunlar
sessizce silinirdi. Engel listesi kullanıcıya sebebiyle döner
("… 6 reçete satırı kaydında kullanılıyor").

Kural: kaydın **kendi alt kayıtları** (doküman, banka, yetkili, poşet satırı)
engel değildir, cascade ile gider. Engel, kaydın **başka bir iş kaydında**
kullanılmasıdır. Toplu silmede biri engelliyse hiçbiri silinmez (yarım silme yok).
Yeni bir tablo/silme eklenince kontrol de bu dosyaya yazılmalı.

## Liste satırı sağ tık menüsü

Her liste satırında sağ tık menüsü olur. Elle `ContextMenu` kurma —
`SatirMenu` (`src/components/ui/satir-menu.tsx`) kullan:

```tsx
<SatirMenu
  key={s.id}
  aksiyonlar={[
    { etiket: "Düzenle", ikon: Pencil, onSecim: () => ac(s) },
    { etiket: "Sil", ikon: Trash2, tehlike: true, ayracOnce: true, onSecim: () => sil(s) },
  ]}
>
  <TableRow>…</TableRow>
</SatirMenu>
```

Kurallar: yıkıcı işlem (`tehlike`) sonda ve ayraçla ayrılır; koşullu öğeler
`gizli` ile gizlenir (görünür aksiyon kalmazsa menü hiç açılmaz); menüdeki
aksiyonlar satırın zaten yapabildikleridir — menüye özel iş mantığı yazılmaz.
Örnek: `src/components/satin-alma/siparis-liste.tsx`.
