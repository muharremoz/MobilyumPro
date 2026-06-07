"use client";

import * as React from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/ui/form-sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
import { RockingChairIcon } from "@/components/ui/icons/rocking-chair";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { TurkishLiraIcon } from "@/components/ui/icons/turkish-lira";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import {
  parcalar as TUM_PARCALAR,
  malzemeler as TUM_MALZEMELER,
  type Kategori,
  type ParcaSatiri,
  type Urun,
} from "@/lib/data";
import { modelMalzemeIhtiyaci } from "@/lib/bom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Trash, Plus as PlusIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const KATEGORILER: Kategori[] = [
  "Oturma Grubu",
  "Yatak Odası",
  "Yemek Odası",
  "Çalışma",
  "Aksesuar",
];

type Form = {
  ad: string;
  id: string;
  kategori: string;
  fiyat: string;
  stok: string;
  durum: string;
};

const bos: Form = {
  ad: "",
  id: "",
  kategori: "",
  fiyat: "",
  stok: "",
  durum: "Aktif",
};

export function ProductSheet({
  open,
  onOpenChange,
  product,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Urun | null;
  onSave: (urun: Urun) => void;
}) {
  const [form, setForm] = React.useState<Form>(bos);
  const [kategoriler, setKategoriler] = React.useState<string[]>([
    ...KATEGORILER,
  ]);
  const [katOpen, setKatOpen] = React.useState(false);
  const [yeniKat, setYeniKat] = React.useState("");
  const [urunParcalar, setUrunParcalar] = React.useState<ParcaSatiri[]>([]);
  const [parcaSec, setParcaSec] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"bilgi" | "parcalar">("bilgi");
  const durumRef = React.useRef<AnimatedIconHandle>(null);
  const duzenleme = !!product;

  React.useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? {
            ad: product.ad,
            id: product.id,
            kategori: product.kategori,
            fiyat: String(product.fiyat),
            stok: String(product.stok),
            durum: product.durum,
          }
        : bos,
    );
    setUrunParcalar(product?.parcalar ? [...product.parcalar] : []);
    setTab("bilgi");
    setParcaSec(null);
  }, [open, product]);

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Ürün adı gerekli");
      return;
    }
    const urun: Urun = {
      id: form.id.trim() || `URN-${Math.floor(1000 + Math.random() * 9000)}`,
      ad: form.ad.trim(),
      kategori: (form.kategori || "Aksesuar") as Kategori,
      fiyat: Number(form.fiyat) || 0,
      stok: Number(form.stok) || 0,
      durum: form.durum === "Pasif" ? "Pasif" : "Aktif",
      parcalar: urunParcalar.length > 0 ? urunParcalar : undefined,
    };
    onSave(urun);
    toast.success(duzenleme ? "Ürün güncellendi" : "Ürün eklendi");
    onOpenChange(false);
  }

  // Parça yönetimi
  function parcaEkle(v: string | null) {
    if (!v) return;
    const p = TUM_PARCALAR.find((x) => x.ad === v);
    if (!p) return;
    setUrunParcalar((ps) => {
      // aynı parça varsa miktarını artır
      const i = ps.findIndex((x) => x.parcaId === p.id);
      if (i >= 0) {
        const n = [...ps];
        n[i] = { ...n[i], miktar: n[i].miktar + 1 };
        return n;
      }
      return [...ps, { parcaId: p.id, miktar: 1 }];
    });
    setParcaSec(null);
  }
  function parcaMiktar(i: number, v: string) {
    const n = Number(v);
    setUrunParcalar((ps) =>
      ps.map((x, j) => (j === i ? { ...x, miktar: isNaN(n) ? 0 : n } : x)),
    );
  }
  function parcaSil(i: number) {
    setUrunParcalar((ps) => ps.filter((_, j) => j !== i));
  }

  const malzemeOzeti = React.useMemo(
    () => modelMalzemeIhtiyaci(urunParcalar, TUM_PARCALAR, TUM_MALZEMELER),
    [urunParcalar],
  );

  function kategoriEkle() {
    const v = yeniKat.trim();
    if (!v) {
      toast.error("Kategori adı gerekli");
      return;
    }
    setKategoriler((k) => (k.includes(v) ? k : [...k, v]));
    set("kategori")(v);
    setKatOpen(false);
    toast.success("Kategori eklendi");
  }

  return (
    <>
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={duzenleme ? "Ürünü Düzenle" : "Yeni Ürün"}
      icon={RockingChairIcon}
      onSave={kaydet}
      contentClassName="p-0"
    >
      <div className="flex h-full flex-col">
        {/* Sekme bar */}
        <div className="flex gap-1 border-b px-3 pt-2">
          <button
            type="button"
            onClick={() => setTab("bilgi")}
            className={cn(
              "cursor-pointer rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
              tab === "bilgi"
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Bilgi
          </button>
          <button
            type="button"
            onClick={() => setTab("parcalar")}
            className={cn(
              "cursor-pointer rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
              tab === "parcalar"
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Parçalar ({urunParcalar.length})
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3.5">
      {tab === "bilgi" && (
      <div className="grid gap-2.5">
        <IconInput
          label="Ürün Adı"
          icon={RockingChairIcon}
          placeholder="Örn. Milano Koltuk Takımı"
          value={form.ad}
          onChange={(e) => set("ad")(e.target.value)}
        />
        <IconInput
          label="Kod"
          icon={ScanTextIcon}
          placeholder="URN-0000"
          value={form.id}
          onChange={(e) => set("id")(e.target.value)}
        />
        <AnimatedField label="Kategori" icon={FolderOpenIcon}>
          <SearchSelect
            items={kategoriler}
            value={form.kategori || null}
            onValueChange={(v) => set("kategori")(v ?? "")}
            placeholder="Kategori seç"
            searchPlaceholder="Kategori ara..."
            addLabel="Yeni kategori ekle"
            onAdd={() => {
              setYeniKat("");
              setKatOpen(true);
            }}
          />
        </AnimatedField>
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Fiyat (₺)"
            type="number"
            icon={TurkishLiraIcon}
            placeholder="0"
            value={form.fiyat}
            onChange={(e) => set("fiyat")(e.target.value)}
          />
          <IconInput
            label="Stok"
            type="number"
            icon={BoxesIcon}
            placeholder="0"
            value={form.stok}
            onChange={(e) => set("stok")(e.target.value)}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setForm((f) => ({
              ...f,
              durum: f.durum === "Aktif" ? "Pasif" : "Aktif",
            }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setForm((f) => ({
                ...f,
                durum: f.durum === "Aktif" ? "Pasif" : "Aktif",
              }));
            }
          }}
          onMouseEnter={() => durumRef.current?.startAnimation()}
          onMouseLeave={() => durumRef.current?.stopAnimation()}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <CircleCheckIcon
              ref={durumRef}
              size={15}
              className="text-muted-foreground"
            />
            Durum
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{form.durum}</span>
            <Switch
              checked={form.durum === "Aktif"}
              className="pointer-events-none data-checked:bg-emerald-600"
            />
          </span>
        </div>
        <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
          <textarea
            rows={3}
            placeholder="Kısa açıklama..."
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </AnimatedField>
      </div>
      )}

      {tab === "parcalar" && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Parça ekle
            </label>
            <SearchSelect
              items={TUM_PARCALAR.filter((p) => p.durum === "Aktif").map(
                (p) => p.ad,
              )}
              value={parcaSec}
              onValueChange={parcaEkle}
              placeholder="Parça seç"
              searchPlaceholder="Parça ara..."
            />
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Parça</TableHead>
                  <TableHead className="w-24 text-right">Miktar</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {urunParcalar.map((s, i) => {
                  const p = TUM_PARCALAR.find((x) => x.id === s.parcaId);
                  return (
                    <TableRow key={`${s.parcaId}-${i}`}>
                      <TableCell className="font-medium">
                        {p?.ad ?? s.parcaId}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p?.kategori}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={s.miktar}
                          onChange={(e) => parcaMiktar(i, e.target.value)}
                          className="h-8 w-20 text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => parcaSil(i)}
                          aria-label="Sil"
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                        >
                          <Trash className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {urunParcalar.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-20 text-center text-sm text-muted-foreground"
                    >
                      Henüz parça eklenmemiş.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Otomatik malzeme dökümü (recursive BOM) */}
          {urunParcalar.length > 0 && (
            <div className="rounded-md border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">
                  Toplam Malzeme İhtiyacı
                </span>
                <Badge variant="secondary" className="text-xs">
                  <PlusIcon className="mr-1 size-3" />
                  Otomatik hesaplandı
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Malzeme</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {malzemeOzeti.map((m) => (
                    <TableRow key={m.malzeme.id}>
                      <TableCell className="font-medium">
                        {m.malzeme.ad}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.toplamMiktar.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.malzeme.birim}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        ₺
                        {m.toplamFiyat.toLocaleString("tr-TR", {
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-sm">
                <span>Tahmini toplam maliyet</span>
                <span className="font-semibold tabular-nums">
                  ₺
                  {malzemeOzeti
                    .reduce((t, m) => t + m.toplamFiyat, 0)
                    .toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </FormSheet>

      {/* Yeni kategori tanımlama modalı */}
      <Dialog open={katOpen} onOpenChange={setKatOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-1 border-white bg-[#f5f5f5] p-2 sm:max-w-sm"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(91,79,65,0.035) 0px, rgba(91,79,65,0.035) 1px, transparent 1px, transparent 4px)",
          }}
        >
          <div className="rounded-md border bg-card p-4">
            <DialogHeader className="mb-3">
              <DialogTitle>Yeni Kategori</DialogTitle>
            </DialogHeader>
            <IconInput
              label="Kategori Adı"
              icon={FolderOpenIcon}
              placeholder="Örn. Bahçe Mobilyası"
              value={yeniKat}
              autoFocus
              onChange={(e) => setYeniKat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  kategoriEkle();
                }
              }}
            />
          </div>
          <div className="flex flex-row justify-end gap-2 rounded-md border bg-card p-2">
            <DialogClose render={<Button variant="outline">İptal</Button>} />
            <Button onClick={kategoriEkle}>Ekle</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
