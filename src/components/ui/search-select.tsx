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

export interface SearchSelectProps {
  items: string[];
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
}

/**
 * Aranabilir tek seçim — Vercel tarzı: kontrolün kendisi input, yazınca
 * liste süzülür (dropdown içinde ayrı arama kutusu yok).
 */
export function SearchSelect({
  items,
  value,
  onValueChange,
  placeholder = "Seçin",
  emptyText = "Sonuç bulunamadı",
  className,
  addLabel,
  onAdd,
}: SearchSelectProps) {
  // "Yeni ekle" tıklanınca popup'ı kapatabilmek için open kontrollü.
  const [acik, setAcik] = React.useState(false);
  // Popup, içteki input'a değil görünür kontrolün tamamına hizalansın.
  const anchorRef = React.useRef<HTMLDivElement>(null);
  return (
    <Combobox
      items={items}
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
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
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
