"use client";

import * as React from "react";
import { Check, ChevronRight, ChevronsUpDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StokGrup } from "@/lib/data";
import { grupKaydet } from "@/lib/db/actions";

/**
 * Ağaçlı grup seçici — Finder/Miller sütun stili.
 * Bir grubu seçince alt grupları sağdaki sütunda açılır; üstte breadcrumb.
 * Değer olarak grubun ADI kullanılır. Yazarak arama: sütunlar gizlenip
 * eşleşen gruplar üst yollarıyla düz liste halinde gösterilir.
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
  // Açık sütun yolu — sürüklenen (drill) grup id'leri; kök sütun her zaman var.
  const [yolIds, setYolIds] = React.useState<string[]>([]);
  // Yerel liste — inline "yeni ekle" ile anında büyür.
  const [liste, setListe] = React.useState<StokGrup[]>(gruplar);
  React.useEffect(() => setListe(gruplar), [gruplar]);
  // Hangi sütunda ekleme formu açık + girilen ad/kod.
  const [ekleKolon, setEkleKolon] = React.useState<number | null>(null);
  const [yeniAd, setYeniAd] = React.useState("");
  const [yeniKod, setYeniKod] = React.useState("");

  const altlar = React.useMemo(() => {
    const m = new Map<string | null, StokGrup[]>();
    for (const g of liste) {
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
  }, [liste]);

  const byId = React.useMemo(
    () => new Map(liste.map((g) => [g.id, g])),
    [liste],
  );

  async function grupEkle(ustId: string | null) {
    const ad = yeniAd.trim();
    const kod = yeniKod.trim();
    if (!ad || !kod) {
      toast.error("Ad ve kod gerekli");
      return;
    }
    const res = await grupKaydet({ ustId, ad, kod });
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Grup eklenemedi.");
      return;
    }
    setListe((l) => [...l, { id: res.id!, ustId, ad, kod, durum: "Aktif" }]);
    setYeniAd("");
    setYeniKod("");
    setEkleKolon(null);
    toast.success("Grup eklendi");
  }

  /** Kök → grup atalarının id yolu (kendisi dahil). */
  const atalarIds = React.useCallback(
    (g: StokGrup): string[] => {
      const ids: string[] = [g.id];
      let ust = g.ustId ? byId.get(g.ustId) : undefined;
      while (ust) {
        ids.unshift(ust.id);
        ust = ust.ustId ? byId.get(ust.ustId) : undefined;
      }
      return ids;
    },
    [byId],
  );

  /** Kök → grup yolu (adlar, kendisi hariç) — arama alt yazısı için. */
  const yolAdlari = React.useCallback(
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

  // Popover açılınca seçili değerin yoluna göre sütunları aç.
  React.useEffect(() => {
    if (!acikPopover) return;
    setArama("");
    setEkleKolon(null);
    const secili = liste.find((g) => g.ad === value);
    setYolIds(secili ? atalarIds(secili) : []);
  }, [acikPopover, liste, value, atalarIds]);

  function sec(g: StokGrup, kolon: number) {
    onValueChange?.(g.ad);
    const cocuklar = altlar.get(g.id) ?? [];
    // Bu sütuna kadar olan yolu koru, tıklananı ekle.
    setYolIds((prev) => [...prev.slice(0, kolon), g.id]);
    if (cocuklar.length === 0) setAcikPopover(false); // yaprak → kapat
  }

  // Görünen sütunlar: kök + yoldaki her (çocuğu olan) grubun çocukları.
  const kolonlar: { ustId: string | null; items: StokGrup[] }[] = [
    { ustId: null, items: altlar.get(null) ?? [] },
  ];
  for (const id of yolIds) {
    const cocuklar = altlar.get(id) ?? [];
    if (cocuklar.length > 0) kolonlar.push({ ustId: id, items: cocuklar });
  }

  // Breadcrumb — yoldaki grup adları.
  const breadcrumb = yolIds
    .map((id) => byId.get(id)?.ad)
    .filter(Boolean) as string[];

  const q = arama.trim().toLocaleLowerCase("tr");
  const eslesenler = q
    ? liste.filter(
        (g) =>
          g.ad.toLocaleLowerCase("tr").includes(q) ||
          g.kod.toLocaleLowerCase("tr").includes(q),
      )
    : [];

  const kokler = altlar.get(null) ?? [];

  // Trigger etiketi — yalnızca seçili grubun adı (tam yol gösterilmez).
  const seciliGrup = liste.find((g) => g.ad === value);
  const triggerEtiket = seciliGrup?.ad ?? "";

  return (
    <Popover open={acikPopover} onOpenChange={setAcikPopover}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
              className,
            )}
          >
            <span
              className={cn(
                "truncate",
                !value && "text-muted-foreground/70",
              )}
            >
              {triggerEtiket || value || placeholder}
            </span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto min-w-(--anchor-width) gap-0 p-1.5"
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

        {q ? (
          // ── Arama modu: düz liste (yol alt yazısıyla) ──
          <div className="max-h-64 min-w-64 overflow-y-auto">
            {eslesenler.length > 0 ? (
              eslesenler.map((g) => {
                const p = yolAdlari(g);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      onValueChange?.(g.ad);
                      setAcikPopover(false);
                    }}
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
            )}
          </div>
        ) : kokler.length > 0 ? (
          // ── Sütun modu (Finder/Miller) ──
          <>
            {breadcrumb.length > 0 && (
              <div className="mb-1.5 flex items-center gap-1 overflow-x-auto px-1 text-[11px] text-muted-foreground">
                {breadcrumb.map((ad, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <ChevronRight className="size-3 shrink-0 opacity-60" />
                    )}
                    <span className="whitespace-nowrap">{ad}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex max-h-72 gap-1 overflow-x-auto">
              {kolonlar.map((kolon, ki) => (
                <div
                  key={ki}
                  className={cn(
                    "flex max-h-72 w-48 shrink-0 flex-col overflow-y-auto",
                    ki > 0 && "border-l pl-1",
                  )}
                >
                  {kolon.items.map((g) => {
                    const cocuklar = altlar.get(g.id) ?? [];
                    const yoldaMi = yolIds[ki] === g.id;
                    const seciliMi = value === g.ad;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => sec(g, ki)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-1.5 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                          yoldaMi && "bg-accent",
                          seciliMi && !yoldaMi && "bg-accent/60 font-medium",
                        )}
                      >
                        <span className="truncate">{g.ad}</span>
                        <span className="ml-auto flex shrink-0 items-center gap-1">
                          {seciliMi && <Check className="size-3.5" />}
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {g.kod}
                          </span>
                          {cocuklar.length > 0 && (
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                  {/* Sütuna yeni grup ekle */}
                  {ekleKolon === ki ? (
                    <div
                      className="mt-1 flex flex-col gap-1 rounded-[5px] bg-muted/40 p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Input
                        autoFocus
                        placeholder="Grup adı"
                        value={yeniAd}
                        onChange={(e) => setYeniAd(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") grupEkle(kolon.ustId);
                          if (e.key === "Escape") setEkleKolon(null);
                        }}
                        className="h-7 text-sm"
                      />
                      <div className="flex gap-1">
                        <Input
                          placeholder="Kod"
                          value={yeniKod}
                          onChange={(e) => setYeniKod(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") grupEkle(kolon.ustId);
                            if (e.key === "Escape") setEkleKolon(null);
                          }}
                          className="h-7 w-16 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => grupEkle(kolon.ustId)}
                          className="flex h-7 flex-1 items-center justify-center rounded-md bg-foreground text-xs font-medium text-background transition-opacity hover:opacity-90"
                        >
                          Ekle
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setYeniAd("");
                        setYeniKod("");
                        setEkleKolon(ki);
                      }}
                      className="mt-1 flex items-center gap-1 rounded-[5px] px-1.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                      {ki === 0 ? "Yeni grup" : "Alt grup ekle"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="min-w-64 px-2 py-3 text-center text-sm text-muted-foreground">
            Henüz grup tanımlanmamış — Tanımlamalar → Gruplar&apos;dan ekleyin.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
