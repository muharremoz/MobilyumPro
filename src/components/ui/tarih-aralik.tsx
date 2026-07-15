"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { tr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ISO (YYYY-MM-DD) ↔ yerel Date — saat dilimi kaymasız.
function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateToIso(d?: Date): string {
  if (!d) return "";
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${ay}-${gun}`;
}
const etiket = (d: Date) =>
  d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });

/**
 * Tarih aralığı seçici — shadcn Calendar (range) + Popover.
 * Değerler ISO (YYYY-MM-DD) string olarak taşınır; boş string = seçilmedi.
 */
export function TarihAralikSecici({
  baslangic,
  bitis,
  onChange,
  placeholder = "Tarih aralığı seç",
  className,
}: {
  baslangic: string;
  bitis: string;
  onChange: (baslangic: string, bitis: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [acik, setAcik] = React.useState(false);
  const from = isoToDate(baslangic);
  const to = isoToDate(bitis);
  const secili: DateRange | undefined = from ? { from, to } : undefined;

  return (
    <Popover open={acik} onOpenChange={setAcik}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 w-full justify-start px-3 font-normal",
              !from && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        {from ? (
          <span className="truncate">
            {etiket(from)}
            {to ? ` – ${etiket(to)}` : " – …"}
          </span>
        ) : (
          <span className="truncate">{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          locale={tr}
          numberOfMonths={2}
          defaultMonth={from}
          selected={secili}
          onSelect={(r) => {
            onChange(dateToIso(r?.from), dateToIso(r?.to));
            // İlk tıklamada from=to (aynı gün) gelir — kapatma; gerçek bir
            // aralık (farklı ikinci gün) seçilince kapat.
            if (r?.from && r?.to && r.to.getTime() !== r.from.getTime())
              setAcik(false);
          }}
        />
        <div className="flex items-center justify-end gap-2 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!from}
            onClick={() => onChange("", "")}
          >
            Temizle
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
