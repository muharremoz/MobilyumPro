"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { tr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * PROJE STANDARDI — tek tarih seçici.
 *
 * `<input type="date">` KULLANILMAZ: tarayıcının yerli seçicisi işletim
 * sistemine göre değişir, tema/dil bizimkiyle uyuşmaz. Tarih alanı gereken
 * her yerde bu bileşen (aralık gerekiyorsa [ui/tarih-aralik.tsx]) kullanılır.
 *
 * Değer ISO (YYYY-MM-DD) string olarak taşınır; boş string = seçilmedi.
 * Böylece form state'i ve DB tarafı `type="date"` ile birebir aynı kalır,
 * geçişte çağıran kodun mantığı değişmez.
 */

// ISO (YYYY-MM-DD) ↔ yerel Date — saat dilimi kaymasız.
// (new Date("2026-07-18") UTC gece yarısı verir ve UTC+3'te bir gün geri kayar.)
export function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function dateToIso(d?: Date): string {
  if (!d) return "";
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${ay}-${gun}`;
}

export const tarihEtiketi = (d: Date) =>
  d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function TarihSecici({
  deger,
  onChange,
  placeholder = "Tarih seç",
  temizlenebilir = true,
  disabled,
  className,
}: {
  /** ISO "YYYY-MM-DD"; boş string = seçilmedi. */
  deger: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Zorunlu alanlarda false verilir — "Temizle" gizlenir. */
  temizlenebilir?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [acik, setAcik] = React.useState(false);
  const secili = isoToDate(deger);

  return (
    <Popover open={acik} onOpenChange={setAcik}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-start px-3 font-normal",
              !secili && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">
          {secili ? tarihEtiketi(secili) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={tr}
          defaultMonth={secili}
          selected={secili}
          onSelect={(d) => {
            onChange(dateToIso(d));
            setAcik(false);
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(dateToIso(new Date()));
              setAcik(false);
            }}
          >
            Bugün
          </Button>
          {temizlenebilir && (
            <Button
              variant="ghost"
              size="sm"
              disabled={!secili}
              onClick={() => {
                onChange("");
                setAcik(false);
              }}
            >
              Temizle
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
