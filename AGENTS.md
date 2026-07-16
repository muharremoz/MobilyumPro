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
