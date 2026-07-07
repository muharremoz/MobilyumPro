"use client";

import * as React from "react";
import { Search, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListHeader } from "@/components/ui/list-header";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { SlidersHorizontalIcon } from "@/components/ui/icons/sliders-horizontal";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
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
import type { SistemParametre } from "@/lib/db/queries";
import { parametreKaydet, parametreSil } from "@/lib/db/actions";

export function SistemParametreleri({
  parametreler,
}: {
  parametreler: SistemParametre[];
}) {
  const [liste, setListe] = React.useState<SistemParametre[]>(parametreler);
  const [arama, setArama] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<SistemParametre | null>(
    null,
  );

  React.useEffect(() => setListe(parametreler), [parametreler]);

  const filtreli = liste.filter((p) => {
    const q = arama.toLowerCase();
    return (
      p.anahtar.toLowerCase().includes(q) ||
      p.deger.toLowerCase().includes(q) ||
      (p.aciklama?.toLowerCase().includes(q) ?? false)
    );
  });

  async function kaydet(p: SistemParametre): Promise<boolean> {
    const res = await parametreKaydet({
      id: p.id || undefined,
      anahtar: p.anahtar,
      deger: p.deger,
      aciklama: p.aciklama,
    });
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Parametre kaydedilemedi.");
      return false;
    }
    const kayit = { ...p, id: res.id };
    setListe((l) => {
      const i = l.findIndex((x) => x.id === kayit.id);
      if (i >= 0) {
        const n = [...l];
        n[i] = kayit;
        return n;
      }
      return [...l, kayit].sort((a, b) => a.anahtar.localeCompare(b.anahtar));
    });
    toast.success(p.id ? "Parametre güncellendi" : "Parametre eklendi");
    return true;
  }

  async function sil(id: number) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== id));
    const res = await parametreSil(id);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Parametre silinemedi.");
      return;
    }
    toast.success("Parametre silindi");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Sistem Parametreleri">
          <div className="relative w-56">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Anahtar veya değer ara..."
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              setDuzenlenen(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" /> Yeni Parametre
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Anahtar</TableHead>
              <TableHead>Değer</TableHead>
              <TableHead>Açıklama</TableHead>
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
                <TableCell className="font-mono text-xs">{p.anahtar}</TableCell>
                <TableCell className="font-medium">{p.deger}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.aciklama ?? "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="İşlemler"
                        >
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
                      <DropdownMenuSeparator />
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
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Parametre bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">
        {filtreli.length} parametre
      </span>

      <ParametreSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        onSave={kaydet}
      />
    </div>
  );
}

function ParametreSheet({
  open,
  onOpenChange,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: SistemParametre | null;
  onSave: (p: SistemParametre) => Promise<boolean>;
}) {
  const [anahtar, setAnahtar] = React.useState("");
  const [deger, setDeger] = React.useState("");
  const [aciklama, setAciklama] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setAnahtar(item?.anahtar ?? "");
    setDeger(item?.deger ?? "");
    setAciklama(item?.aciklama ?? "");
  }, [open, item]);

  async function kaydet() {
    if (!anahtar.trim()) {
      toast.error("Anahtar gerekli");
      return;
    }
    const ok = await onSave({
      id: item?.id ?? 0,
      anahtar: anahtar.trim(),
      deger: deger.trim(),
      aciklama: aciklama.trim() || undefined,
    });
    if (ok) onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Parametreyi Düzenle" : "Yeni Parametre"}
      icon={SlidersHorizontalIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Anahtar"
          icon={ScanTextIcon}
          placeholder="Örn. varsayilan_kdv"
          value={anahtar}
          onChange={(e) => setAnahtar(e.target.value)}
        />
        <IconInput
          label="Değer"
          icon={SlidersHorizontalIcon}
          placeholder="Örn. 20"
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
        />
        <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
          <textarea
            rows={2}
            placeholder="Bu parametre ne işe yarıyor?"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </AnimatedField>
      </div>
    </FormSheet>
  );
}
