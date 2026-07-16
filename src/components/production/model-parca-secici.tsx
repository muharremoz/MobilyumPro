"use client";

import * as React from "react";
import { ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Dropdown üstünde sekme — her sekmenin kendi öğe listesi vardır. */
export type SecimSekmesi = { key: string; label: string; items: string[] };

/**
 * Model / parça seçici — GrupSecici deseni: kompakt tetikleyici buton + içeriğe
 * göre daralan popover (kendi arama kutusuyla). SearchSelect'in aksine kontrol
 * inline input değildir; geniş tablo kolonlarında yayılmaz.
 *
 * Öğe değerleri "Model · X" / "Parça · Y" biçimindedir; gösterimde önek atılır,
 * onValueChange'e değer önekiyle döner (çağıran taraf tipi ondan çözer).
 */
export function ModelParcaSecici({
  sekmeler,
  onValueChange,
  placeholder = "Seçin",
  emptyText = "Sonuç bulunamadı",
  className,
}: {
  sekmeler: SecimSekmesi[];
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [acik, setAcik] = React.useState(false);
  const [arama, setArama] = React.useState("");
  const [aktifSekme, setAktifSekme] = React.useState(
    () => sekmeler[0]?.key ?? "",
  );

  // Gösterimde "Etiket · " öneki atılır; değer korunur.
  const goster = (item: string) => item.replace(/^[^·]+·\s*/, "");

  const kaynak =
    (sekmeler.find((s) => s.key === aktifSekme) ?? sekmeler[0])?.items ?? [];
  const q = arama.trim().toLocaleLowerCase("tr");
  const suzulmus = q
    ? kaynak.filter((i) => goster(i).toLocaleLowerCase("tr").includes(q))
    : kaynak;

  return (
    <Popover
      open={acik}
      onOpenChange={(o) => {
        setAcik(o);
        if (o) setArama("");
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-8 w-64 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
              className,
            )}
          >
            <span className="truncate text-muted-foreground/70">
              {placeholder}
            </span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent align="start" sideOffset={6} className="w-auto gap-0 p-1.5">
        <div className="relative mb-1.5">
          <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-8 pl-7"
          />
        </div>

        {sekmeler.length > 1 && (
          <div className="mb-1.5 flex gap-1">
            {sekmeler.map((sek) => (
              <button
                key={sek.key}
                type="button"
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

        <div className="max-h-64 min-w-64 overflow-y-auto">
          {suzulmus.length > 0 ? (
            suzulmus.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onValueChange?.(item);
                  setAcik(false);
                }}
                className="flex w-full cursor-pointer items-center rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">{goster(item)}</span>
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
