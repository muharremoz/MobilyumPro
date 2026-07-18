"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  sections,
  bottomSections,
  type Section,
  type SubItem,
} from "@/components/nav/nav-config";

/**
 * Komut paleti — sidebar aramasının yerini alır (cmdk / shadcn Command).
 *
 * Menüdeki her sayfa buradan aranıp açılabilir. Kısayol: F veya Ctrl/Cmd+K.
 * Süzme ve klavye gezinmesi cmdk'ya bırakılmıştır; burada yalnız kaynak liste
 * üretilir, böylece nav-config'e eklenen her yeni sayfa palete de düşer.
 */

type PaletOgesi = SubItem & { bolum: string };

/** Bölüm başlığı → o bölümden gidilebilen sayfalar. */
function paletGruplari(): Array<{ bolum: string; ogeler: PaletOgesi[] }> {
  const gruplar: Array<{ bolum: string; ogeler: PaletOgesi[] }> = [];
  for (const s of [...sections, ...bottomSections] as Section[]) {
    const ogeler: PaletOgesi[] = [];
    // Doğrudan gidilen bölüm (alt menüsü yok) kendi başına bir sonuçtur.
    if (s.href && s.href !== "#") {
      ogeler.push({
        label: s.label,
        href: s.href,
        icon: s.RailIcon,
        bolum: s.label,
      });
    }
    for (const it of s.items ?? []) {
      // href "#" olanlar "yakında" — gidilecek sayfası yok, palete alınmaz.
      if (it.href !== "#") ogeler.push({ ...it, bolum: s.label });
    }
    if (ogeler.length) gruplar.push({ bolum: s.label, ogeler });
  }
  return gruplar;
}

export function KomutPaleti({
  acik,
  onAcikDegis,
}: {
  acik: boolean;
  onAcikDegis: (v: boolean) => void;
}) {
  const router = useRouter();
  const gruplar = React.useMemo(() => paletGruplari(), []);

  function git(href: string) {
    onAcikDegis(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={acik}
      onOpenChange={onAcikDegis}
      title="Komut Paleti"
      description="Sayfa ara ve git"
    >
      {/*
        Bu sürümdeki CommandDialog çocukları doğrudan DialogContent'e koyar,
        Command sarmalayıcısını kendisi eklemez. Olmazsa cmdk store'u
        bulunamaz ve CommandInput "reading 'subscribe'" ile patlar.
      */}
      <Command>
        <CommandInput placeholder="Sayfa ara…" />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          {gruplar.map((g) => (
            <CommandGroup key={g.bolum} heading={g.bolum}>
              {g.ogeler.map((o) => {
                const Ikon = o.icon;
                return (
                  <CommandItem
                    // Aynı etiket farklı bölümlerde geçebilir; değer bölümle
                    // birlikte kuruluyor ki cmdk sonuçları karıştırmasın.
                    key={`${g.bolum}-${o.href}-${o.label}`}
                    value={`${o.label} ${g.bolum}`}
                    onSelect={() => git(o.href)}
                  >
                    <Ikon size={16} className="shrink-0" />
                    <span>{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
