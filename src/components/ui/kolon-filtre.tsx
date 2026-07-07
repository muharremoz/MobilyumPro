"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Trash2,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { TableHead } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * PROJE STANDARDI — Liste kolon başlığı: sırala + filtre popover'ı.
 *
 * Her liste tablosunda kolon başlıkları bu bileşenle yazılır; ListHeader'da
 * ayrı arama kutusu OLMAZ (arama kolon filtrelerinden yapılır).
 *
 * Kullanım:
 *   <SiralaFiltreBaslik
 *     sira={sort.key === "ad" ? sort.dir : null}
 *     onSirala={(dir) => setSort({ key: "ad", dir })}
 *     filtre={{ tip: "metin", deger: adFiltre, onDeger: setAdFiltre }}
 *   >
 *     Ad
 *   </SiralaFiltreBaslik>
 *
 * Filtre tipleri:
 *   metin → "içeren" araması (Input)
 *   sayi  → En az / En çok aralığı
 *   liste → seçenek listesi ("Tümü" varsayılan)
 */
export type KolonFiltre =
  | {
      tip: "metin";
      deger: string;
      onDeger: (v: string) => void;
      placeholder?: string;
    }
  | {
      tip: "sayi";
      min: string;
      max: string;
      onDegis: (min: string, max: string) => void;
    }
  | {
      tip: "liste";
      secenekler: string[];
      deger: string;
      onDeger: (v: string) => void;
      /** "Tümü" etiketi (filtre pasif değeri). */
      tumu?: string;
    };

function filtreAktif(f: KolonFiltre, tumu: string): boolean {
  if (f.tip === "metin") return f.deger !== "";
  if (f.tip === "sayi") return f.min !== "" || f.max !== "";
  return f.deger !== tumu;
}

const ogeCls = (seciliMi: boolean) =>
  cn(
    "flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
    seciliMi && "bg-accent/60 font-medium",
  );

export function SiralaFiltreBaslik({
  children,
  className,
  sira,
  onSirala,
  filtre,
}: {
  children: React.ReactNode;
  className?: string;
  /** Bu kolonun mevcut sırası (sıralı değilse null). */
  sira: "asc" | "desc" | null;
  onSirala: (dir: "asc" | "desc") => void;
  /** Verilmezse yalnızca sıralama sunulur. */
  filtre?: KolonFiltre;
}) {
  const tumu = filtre?.tip === "liste" ? (filtre.tumu ?? "Tümü") : "Tümü";
  const aktif = filtre ? filtreAktif(filtre, tumu) : false;

  function temizle() {
    if (!filtre) return;
    if (filtre.tip === "metin") filtre.onDeger("");
    else if (filtre.tip === "sayi") filtre.onDegis("", "");
    else filtre.onDeger(tumu);
  }

  return (
    <TableHead className={className}>
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
            >
              {children}
              {sira === null ? (
                <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
              ) : sira === "asc" ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              {aktif && (
                <span className="ml-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          }
        />
        <PopoverContent align="start" className="w-56 gap-0 p-1.5 text-left">
          <p className="px-1.5 pt-0.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Sırala
          </p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              className={cn(ogeCls(sira === "asc"), "justify-center")}
              onClick={() => onSirala("asc")}
            >
              <ArrowUpNarrowWide className="size-4" /> Artan
            </button>
            <button
              type="button"
              className={cn(ogeCls(sira === "desc"), "justify-center")}
              onClick={() => onSirala("desc")}
            >
              <ArrowDownWideNarrow className="size-4" /> Azalan
            </button>
          </div>

          {filtre && (
            <>
              <div className="my-1.5 h-px bg-border" />
              <p className="px-1.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Filtre
              </p>

              {filtre.tip === "metin" && (
                <Input
                  autoFocus
                  placeholder={filtre.placeholder ?? "İçeren metin..."}
                  value={filtre.deger}
                  onChange={(e) => filtre.onDeger(e.target.value)}
                  className="h-8"
                />
              )}
              {filtre.tip === "sayi" && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    type="number"
                    placeholder="En az"
                    value={filtre.min}
                    onChange={(e) => filtre.onDegis(e.target.value, filtre.max)}
                    className="h-8 tabular-nums"
                  />
                  <Input
                    type="number"
                    placeholder="En çok"
                    value={filtre.max}
                    onChange={(e) => filtre.onDegis(filtre.min, e.target.value)}
                    className="h-8 tabular-nums"
                  />
                </div>
              )}
              {filtre.tip === "liste" && (
                <div className="grid max-h-56 gap-0.5 overflow-y-auto">
                  {[tumu, ...filtre.secenekler.filter((s) => s !== tumu)].map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        className={ogeCls(filtre.deger === v)}
                        onClick={() => filtre.onDeger(v)}
                      >
                        {v}
                        {filtre.deger === v && (
                          <Check className="ml-auto size-4" />
                        )}
                      </button>
                    ),
                  )}
                </div>
              )}

              {aktif && (
                <>
                  <div className="my-1.5 h-px bg-border" />
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                    onClick={temizle}
                  >
                    <Trash2 className="size-3.5" /> Filtreyi temizle
                  </button>
                </>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>
    </TableHead>
  );
}
