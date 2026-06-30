"use client";

import * as React from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { type Malzeme } from "@/lib/data";

type PosetSatiri = { malzemeId: string; miktar: number };
type Poset = {
  id: string;
  ad: string;
  aciklama?: string;
  durum: "Aktif" | "Pasif";
  malzemeler: PosetSatiri[];
};

const ILK: Poset[] = [
  {
    id: "POS-01",
    ad: "Komidin Montaj Poşeti",
    aciklama: "2 çekmeceli komidin için bağlantı seti",
    durum: "Aktif",
    malzemeler: [
      { malzemeId: "MLZ-1007", miktar: 30 },
      { malzemeId: "MLZ-1009", miktar: 2 },
    ],
  },
  {
    id: "POS-02",
    ad: "Gardırop Kapak Poşeti",
    aciklama: "Menteşe + vida seti",
    durum: "Aktif",
    malzemeler: [
      { malzemeId: "MLZ-1008", miktar: 12 },
      { malzemeId: "MLZ-1007", miktar: 48 },
    ],
  },
];

export function MaterialBags({ malzemeler }: { malzemeler: Malzeme[] }) {
  const [liste, setListe] = React.useState<Poset[]>(ILK);
  const [arama, setArama] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Poset | null>(null);

  const filtreli = liste.filter(
    (p) =>
      p.ad.toLowerCase().includes(arama.toLowerCase()) ||
      p.id.toLowerCase().includes(arama.toLowerCase()),
  );

  function kaydet(p: Poset) {
    setListe((l) => {
      const i = l.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        const n = [...l];
        n[i] = p;
        return n;
      }
      return [p, ...l];
    });
  }
  function sil(id: string) {
    setListe((l) => l.filter((x) => x.id !== id));
    toast.success("Poşet silindi");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Poşet veya kod ara..."
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
          <Plus className="size-4" /> Yeni Poşet
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Poşet</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead className="text-right">Malzeme</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => {
                  setDuzenlenen(p);
                  setSheetOpen(true);
                }}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {p.id}
                </TableCell>
                <TableCell className="font-medium">{p.ad}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.aciklama ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {p.malzemeler.length}
                </TableCell>
                <TableCell>
                  <Badge variant={p.durum === "Aktif" ? "default" : "secondary"}>
                    {p.durum}
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
                          setDuzenlenen(p);
                          setSheetOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil(p.id)}
                      >
                        <Trash2 className="mr-2 size-4" /> Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Poşet bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">{filtreli.length} poşet</span>

      <PosetSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        malzemeler={malzemeler}
        onSave={kaydet}
      />
    </div>
  );
}

function PosetSheet({
  open,
  onOpenChange,
  item,
  malzemeler,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Poset | null;
  malzemeler: Malzeme[];
  onSave: (p: Poset) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [aciklama, setAciklama] = React.useState("");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">("Aktif");
  const [satirlar, setSatirlar] = React.useState<PosetSatiri[]>([]);
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    setAd(item?.ad ?? "");
    setAciklama(item?.aciklama ?? "");
    setDurum(item?.durum ?? "Aktif");
    setSatirlar(item?.malzemeler ? [...item.malzemeler] : []);
  }, [open, item]);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );

  function satirEkle() {
    setSatirlar((s) => [...s, { malzemeId: "", miktar: 1 }]);
  }
  function satirMalzeme(i: number, ad: string | null) {
    if (!ad) return;
    const m = malzemeler.find((x) => x.ad === ad);
    if (!m) return;
    setSatirlar((s) => s.map((x, j) => (j === i ? { ...x, malzemeId: m.id } : x)));
  }
  function satirMiktar(i: number, v: string) {
    const n = Number(v);
    setSatirlar((s) =>
      s.map((x, j) => (j === i ? { ...x, miktar: isNaN(n) ? 0 : n } : x)),
    );
  }
  function satirSil(i: number) {
    setSatirlar((s) => s.filter((_, j) => j !== i));
  }

  function kaydet() {
    if (!ad.trim()) {
      toast.error("Poşet adı gerekli");
      return;
    }
    onSave({
      id: item?.id ?? `POS-${Math.floor(10 + Math.random() * 90)}`,
      ad: ad.trim(),
      aciklama: aciklama.trim() || undefined,
      durum,
      malzemeler: satirlar.filter((s) => s.malzemeId),
    });
    toast.success(item ? "Poşet güncellendi" : "Poşet eklendi");
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Poşeti Düzenle" : "Yeni Poşet"}
      icon={BoxesIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Poşet Adı"
          icon={BoxesIcon}
          placeholder="Örn. Komidin Montaj Poşeti"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
        <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
          <textarea
            rows={2}
            placeholder="Kısa açıklama..."
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </AnimatedField>

        {/* İçindeki malzemeler */}
        <div className="grid gap-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <ScanTextIcon size={15} className="text-muted-foreground" />
            İçerik
          </label>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Malzeme</TableHead>
                  <TableHead className="w-20 text-right">Miktar</TableHead>
                  <TableHead className="w-16">Birim</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {satirlar.map((s, i) => {
                  const m = s.malzemeId ? malzemeMap.get(s.malzemeId) : undefined;
                  const seciliBaskaIds = new Set(
                    satirlar
                      .filter((_, j) => j !== i)
                      .map((x) => x.malzemeId)
                      .filter(Boolean),
                  );
                  const items = malzemeler
                    .filter((x) => x.durum === "Aktif" && !seciliBaskaIds.has(x.id))
                    .map((x) => x.ad);
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <SearchSelect
                          items={items}
                          value={m?.ad ?? null}
                          onValueChange={(v) => satirMalzeme(i, v)}
                          placeholder="Malzeme seç"
                          searchPlaceholder="Malzeme ara..."
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={s.miktar}
                          onChange={(e) => satirMiktar(i, e.target.value)}
                          className="h-7 w-16 text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m?.birim ?? ""}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => satirSil(i)}
                          aria-label="Sil"
                          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                        >
                          <Trash className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <button
            type="button"
            onClick={satirEkle}
            disabled={
              satirlar.filter((s) => s.malzemeId).length >=
              malzemeler.filter((m) => m.durum === "Aktif").length
            }
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Malzeme ekle
          </button>
        </div>

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
