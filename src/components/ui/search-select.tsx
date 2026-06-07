"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

export interface SearchSelectProps {
  items: string[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  /** Dropdown altına "yeni ekle" butonu koyar; tıklanınca çağrılır. */
  addLabel?: string;
  onAdd?: () => void;
}

/** Aranabilir tek seçim: trigger normal select gibi, arama kutusu dropdown'ın içinde. */
export function SearchSelect({
  items,
  value,
  onValueChange,
  placeholder = "Seçin",
  searchPlaceholder = "Ara...",
  emptyText = "Sonuç bulunamadı",
  className,
  addLabel,
  onAdd,
}: SearchSelectProps) {
  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(v) => onValueChange?.(v as string | null)}
    >
      <ComboboxTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
          className,
        )}
      >
        <ComboboxValue>
          {(val: string | null) =>
            val ? (
              <span className="truncate">{val}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )
          }
        </ComboboxValue>
      </ComboboxTrigger>

      <ComboboxContent className="min-w-(--anchor-width)">
        <ComboboxInput placeholder={searchPlaceholder} showTrigger={false} />
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
              onClick={onAdd}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
