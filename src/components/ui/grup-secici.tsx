"use client";

import * as React from "react";
import { Check, ChevronRight, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StokGrup } from "@/lib/data";

/**
 * Ağaçlı grup seçici — Tanımlamalar → Gruplar ağacından tek seçim.
 * Değer olarak grubun ADI kullanılır (Model.kategori string alanına yazılır).
 * Yazarak arama: eşleşen gruplar üst yollarıyla düz liste halinde gösterilir.
 */
export function GrupSecici({
  gruplar,
  value,
  onValueChange,
  placeholder = "Grup seç",
  className,
}: {
  gruplar: StokGrup[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [acikPopover, setAcikPopover] = React.useState(false);
  const [arama, setArama] = React.useState("");
  const [acik, setAcik] = React.useState<Set<string>>(new Set());

  const altlar = React.useMemo(() => {
    const m = new Map<string | null, StokGrup[]>();
    for (const g of gruplar) {
      const arr = m.get(g.ustId) ?? [];
      arr.push(g);
      m.set(g.ustId, arr);
    }
    for (const arr of m.values())
      arr.sort(
        (a, b) =>
          a.kod.localeCompare(b.kod, "tr") || a.ad.localeCompare(b.ad, "tr"),
      );
    return m;
  }, [gruplar]);

  const byId = React.useMemo(
    () => new Map(gruplar.map((g) => [g.id, g])),
    [gruplar],
  );

  /** Kök → grup yolu (kendisi hariç). */
  const yol = React.useCallback(
    (g: StokGrup): string[] => {
      const parcalar: string[] = [];
      let ust = g.ustId ? byId.get(g.ustId) : undefined;
      while (ust) {
        parcalar.unshift(ust.ad);
        ust = ust.ustId ? byId.get(ust.ustId) : undefined;
      }
      return parcalar;
    },
    [byId],
  );

  // Popover açılınca seçili değerin atalarını genişlet.
  React.useEffect(() => {
    if (!acikPopover) return;
    setArama("");
    const secili = gruplar.find((g) => g.ad === value);
    if (!secili) return;
    const n = new Set<string>();
    let ust = secili.ustId ? byId.get(secili.ustId) : undefined;
    while (ust) {
      n.add(ust.id);
      ust = ust.ustId ? byId.get(ust.ustId) : undefined;
    }
    setAcik(n);
  }, [acikPopover, gruplar, value, byId]);

  function sec(g: StokGrup) {
    onValueChange?.(g.ad);
    setAcikPopover(false);
  }

  function acKapa(id: string) {
    setAcik((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const q = arama.trim().toLocaleLowerCase("tr");
  const eslesenler = q
    ? gruplar.filter(
        (g) =>
          g.ad.toLocaleLowerCase("tr").includes(q) ||
          g.kod.toLocaleLowerCase("tr").includes(q),
      )
    : [];

  function Satir({ grup, seviye }: { grup: StokGrup; seviye: number }) {
    const cocuklar = altlar.get(grup.id) ?? [];
    const acikMi = acik.has(grup.id);
    const seciliMi = value === grup.ad;
    return (
      <>
        <button
          type="button"
          onClick={() => sec(grup)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-1 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            seciliMi && "bg-accent/60 font-medium",
          )}
          style={{ paddingLeft: 6 + seviye * 18 }}
        >
          {cocuklar.length > 0 ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                acKapa(grup.id);
              }}
              className="inline-flex size-4 shrink-0 items-center justify-center rounded hover:bg-black/10"
            >
              <ChevronRight
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform",
                  acikMi && "rotate-90",
                )}
              />
            </span>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="truncate">{grup.ad}</span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {grup.kod}
          </span>
          {seciliMi && <Check className="size-4 shrink-0" />}
        </button>
        {acikMi &&
          cocuklar.map((c) => (
            <Satir key={c.id} grup={c} seviye={seviye + 1} />
          ))}
      </>
    );
  }

  const kokler = altlar.get(null) ?? [];

  return (
    <Popover open={acikPopover} onOpenChange={setAcikPopover}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
              className,
            )}
          >
            <span className={cn("truncate", !value && "text-muted-foreground/70")}>
              {value || placeholder}
            </span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--anchor-width) min-w-64 gap-0 p-1.5"
      >
        <div className="relative mb-1.5">
          <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Grup ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-8 pl-7"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {q ? (
            eslesenler.length > 0 ? (
              eslesenler.map((g) => {
                const p = yol(g);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => sec(g)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      value === g.ad && "bg-accent/60 font-medium",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{g.ad}</span>
                      {p.length > 0 && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {p.join(" › ")}
                        </span>
                      )}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      {g.kod}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                Sonuç bulunamadı
              </p>
            )
          ) : kokler.length > 0 ? (
            kokler.map((g) => <Satir key={g.id} grup={g} seviye={0} />)
          ) : (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              Henüz grup tanımlanmamış — Tanımlamalar → Gruplar&apos;dan ekleyin.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
