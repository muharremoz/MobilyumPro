"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";

/**
 * Proje standardı çoklu seçim — SearchSelect'in `multiple` karşılığı.
 * Aynı combobox primitifleri: chips'li giriş + yazarak süzme + check'li liste.
 */
export function MultiSearchSelect({
  items,
  value,
  onValueChange,
  placeholder,
  emptyText = "Sonuç bulunamadı",
  className,
}: {
  items: string[];
  value: string[];
  onValueChange: (v: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const anchorRef = useComboboxAnchor();
  return (
    <Combobox
      multiple
      items={items}
      value={value}
      onValueChange={(v) => onValueChange((v as string[]) ?? [])}
    >
      <div ref={anchorRef} className={cn("w-full", className)}>
        <ComboboxChips>
          {value.map((v) => (
            <ComboboxChip key={v}>{v}</ComboboxChip>
          ))}
          <ComboboxChipsInput
            placeholder={value.length === 0 ? placeholder : undefined}
          />
        </ComboboxChips>
      </div>
      <ComboboxContent anchor={anchorRef} sideOffset={6}>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
