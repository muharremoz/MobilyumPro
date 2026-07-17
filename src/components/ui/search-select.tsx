"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

/** Dropdown üstünde sekme — her sekmenin kendi öğe listesi vardır. */
export interface SearchSelectSekme {
  key: string;
  label: string;
  items: string[];
}

export interface SearchSelectProps {
  items?: string[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  /** @deprecated Arama artık kontrolün kendisinde; geriye uyumluluk için tutuluyor. */
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  /** Dropdown altına "yeni ekle" butonu koyar; tıklanınca çağrılır. */
  addLabel?: string;
  onAdd?: () => void;
  /**
   * Verilirse dropdown üstünde sekmeler gösterilir; aktif sekmenin öğeleri
   * listelenir. Öğe değerleri korunur, gösterimde "Etiket · " öneki atılır.
   */
  sekmeler?: SearchSelectSekme[];
}

/**
 * Aranabilir tek seçim — Vercel tarzı: kontrolün kendisi input, yazınca
 * liste süzülür (dropdown içinde ayrı arama kutusu yok).
 */
export function SearchSelect({
  items = [],
  value,
  onValueChange,
  placeholder = "Seçin",
  emptyText = "Sonuç bulunamadı",
  className,
  addLabel,
  onAdd,
  sekmeler,
}: SearchSelectProps) {
  // "Yeni ekle" tıklanınca popup'ı kapatabilmek için open kontrollü.
  const [acik, setAcik] = React.useState(false);
  // Sekmeli modda aktif sekme.
  const [aktifSekme, setAktifSekme] = React.useState(
    () => sekmeler?.[0]?.key ?? "",
  );
  // Popup, içteki input'a değil görünür kontrolün tamamına hizalansın.
  const anchorRef = React.useRef<HTMLDivElement>(null);
  // Yinelenen öğeler tekilleştirilir (aynı key hatası + kaybolan öğe önlenir).
  // Aktif kaynak (sekmeli modda seçili sekmenin öğeleri) memo'nun İÇİNDE
  // hesaplanır: dışarıda "?? []" her render'da yeni dizi üretip memo'yu
  // işlevsiz bırakıyordu.
  const benzersiz = React.useMemo(() => {
    const kaynak = sekmeler
      ? ((sekmeler.find((s) => s.key === aktifSekme) ?? sekmeler[0])?.items ??
        [])
      : items;
    return Array.from(new Set(kaynak));
  }, [sekmeler, aktifSekme, items]);
  // Sekmeli modda gösterimde "Etiket · " öneki atılır (değer korunur).
  const gosterim = (item: string) =>
    sekmeler ? item.replace(/^[^·]+·\s*/, "") : item;
  return (
    <Combobox
      items={benzersiz}
      value={value}
      onValueChange={(v) => onValueChange?.(v as string | null)}
      open={acik}
      onOpenChange={setAcik}
    >
      <div ref={anchorRef}>
        <ComboboxInput
          placeholder={placeholder}
          className={cn("w-full", className)}
          onClick={() => setAcik(true)}
        />
      </div>

      <ComboboxContent
        anchor={anchorRef}
        sideOffset={10}
        className="min-w-(--anchor-width)"
      >
        {sekmeler && (
          <div className="flex gap-1 border-b p-1">
            {sekmeler.map((sek) => (
              <button
                key={sek.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setAktifSekme(sek.key)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  aktifSekme === sek.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-black/5",
                )}
              >
                {sek.label}
                <span className="ml-1 tabular-nums opacity-60">
                  {sek.items.length}
                </span>
              </button>
            ))}
          </div>
        )}
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {gosterim(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
        {onAdd && (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => {
                setAcik(false); // popup açık kalıp modalla karışmasın
                onAdd();
              }}
              className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-black/10"
            >
              <Plus className="size-4" />
              {addLabel ?? "Yeni ekle"}
            </button>
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
