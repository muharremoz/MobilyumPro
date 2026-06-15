"use client";

import * as React from "react";
import { Search, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Depo = {
  id: string;
  ad: string;
  sehir: string;
  kapasite: number;
  doluluk: number;
  durum: "Aktif" | "Pasif";
};

const ILK: Depo[] = [
  { id: "DEP-01", ad: "Ana Depo", sehir: "İstanbul", kapasite: 5000, doluluk: 3420, durum: "Aktif" },
  { id: "DEP-02", ad: "Yedek Depo", sehir: "İstanbul", kapasite: 2000, doluluk: 880, durum: "Aktif" },
  { id: "DEP-03", ad: "Showroom Merkez", sehir: "İstanbul", kapasite: 300, doluluk: 215, durum: "Aktif" },
  { id: "DEP-04", ad: "Bursa Bölge", sehir: "Bursa", kapasite: 1500, doluluk: 0, durum: "Pasif" },
];

export function Warehouses() {
  const [liste, setListe] = React.useState<Depo[]>(ILK);
  const [arama, setArama] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Depo | null>(null);

  const filtreli = liste.filter(
    (d) =>
      d.ad.toLowerCase().includes(arama.toLowerCase()) ||
      d.sehir.toLowerCase().includes(arama.toLowerCase()),
  );

  function kaydet(d: Depo) {
    setListe((l) => {
      const i = l.findIndex((x) => x.id === d.id);
      if (i >= 0) {
        const n = [...l];
        n[i] = d;
        return n;
      }
      return [d, ...l];
    });
  }

  function sil(id: string) {
    setListe((l) => l.filter((x) => x.id !== id));
    toast.success("Depo silindi");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Depo veya şehir ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Button
          className="ml-auto"
          onClick={() => {
            setDuzenlenen(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="size-4" /> Yeni Depo
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead className="text-right">Kapasite</TableHead>
              <TableHead className="text-right">Doluluk</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((d) => {
              const yuzde = d.kapasite ? Math.round((d.doluluk / d.kapasite) * 100) : 0;
              return (
                <TableRow
                  key={d.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setDuzenlenen(d);
                    setSheetOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {d.id}
                  </TableCell>
                  <TableCell className="font-medium">{d.ad}</TableCell>
                  <TableCell className="text-muted-foreground">{d.sehir}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.kapasite}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.doluluk} <span className="text-muted-foreground">({yuzde}%)</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.durum === "Aktif" ? "default" : "secondary"}>
                      {d.durum}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="İşlemler">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => {
                            setDuzenlenen(d);
                            setSheetOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 size-4" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => sil(d.id)}>
                          <Trash2 className="mr-2 size-4" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Depo bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">{filtreli.length} depo</span>

      <DepoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        onSave={kaydet}
      />
    </div>
  );
}

function DepoSheet({
  open,
  onOpenChange,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Depo | null;
  onSave: (d: Depo) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [sehir, setSehir] = React.useState("");
  const [kapasite, setKapasite] = React.useState("");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">("Aktif");
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    setAd(item?.ad ?? "");
    setSehir(item?.sehir ?? "");
    setKapasite(item?.kapasite ? String(item.kapasite) : "");
    setDurum(item?.durum ?? "Aktif");
  }, [open, item]);

  function kaydet() {
    if (!ad.trim()) {
      toast.error("Depo adı gerekli");
      return;
    }
    onSave({
      id: item?.id ?? `DEP-${Math.floor(Math.random() * 1000)}`,
      ad: ad.trim(),
      sehir: sehir.trim(),
      kapasite: Number(kapasite) || 0,
      doluluk: item?.doluluk ?? 0,
      durum,
    });
    toast.success(item ? "Depo güncellendi" : "Depo eklendi");
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Depoyu Düzenle" : "Yeni Depo"}
      icon={BlocksIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Depo Adı"
          icon={BlocksIcon}
          placeholder="Örn. Ana Depo"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
        <AnimatedField label="Şehir" icon={BlocksIcon}>
          <input
            type="text"
            placeholder="Örn. İstanbul"
            value={sehir}
            onChange={(e) => setSehir(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </AnimatedField>
        <IconInput
          label="Kapasite (adet)"
          icon={BlocksIcon}
          type="number"
          placeholder="0"
          value={kapasite}
          onChange={(e) => setKapasite(e.target.value)}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => setDurum((s) => (s === "Aktif" ? "Pasif" : "Aktif"))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDurum((s) => (s === "Aktif" ? "Pasif" : "Aktif"));
            }
          }}
          onMouseEnter={() => durumRef.current?.startAnimation()}
          onMouseLeave={() => durumRef.current?.stopAnimation()}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <CircleCheckIcon ref={durumRef} size={15} className="text-muted-foreground" />
            Durum
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{durum}</span>
            <Switch
              checked={durum === "Aktif"}
              className="pointer-events-none data-checked:bg-emerald-600"
            />
          </span>
        </div>
      </div>
    </FormSheet>
  );
}
