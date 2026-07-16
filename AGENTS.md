<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Proje standartları

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
