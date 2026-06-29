"use client";

import * as React from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { LayersIcon } from "@/components/ui/icons/layers";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { TurkishLiraIcon } from "@/components/ui/icons/turkish-lira";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { UsersRoundIcon } from "@/components/ui/icons/users-round";
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
import { formatTL, type Malzeme, type MalzemeTipi } from "@/lib/data";
import { malzemeKaydet, malzemeSil } from "@/lib/db/actions";

const TIPLER: MalzemeTipi[] = ["Hammadde", "Yarı Mamul", "Yardımcı"];
const BIRIMLER = ["adet", "m", "m²", "m³", "kg", "lt", "takım"];
const TIP_RENK: Record<MalzemeTipi, string> = {
  Hammadde: "bg-blue-100 text-blue-800",
  "Yarı Mamul": "bg-violet-100 text-violet-800",
  Yardımcı: "bg-amber-100 text-amber-800",
};
const SAYFA_BOYUT = 8;
type SortKey = "id" | "ad" | "tip" | "birim" | "stok" | "birimFiyat" | "durum";

export function Materials({ malzemeler }: { malzemeler: Malzeme[] }) {
  const [liste, setListe] = React.useState<Malzeme[]>(malzemeler);
  const [arama, setArama] = React.useState("");
  const [tip, setTip] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "id",
    dir: "asc",
  });
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Malzeme | null>(null);

  React.useEffect(() => setSayfa(1), [arama, tip, durum]);

  const filtreli = React.useMemo(() => {
    const q = arama.toLowerCase();
    const arr = liste.filter((m) => {
      const ara =
        m.ad.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
      const t = tip === "Tümü" || m.tip === tip;
      const d = durum === "Tümü" || m.durum === durum;
      return ara && t && d;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, arama, tip, durum, sort]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
  const sayfaIds = sayfalik.map((m) => m.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  function sortla(k: SortKey) {
    setSort((s) =>
      s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" },
    );
  }
  function secimDegis(id: string, v: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  }
  function tumunuSec(v: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      sayfaIds.forEach((id) => (v ? n.add(id) : n.delete(id)));
      return n;
    });
  }
  async function sil(ids: string[]) {
    const kaldirilan = liste.filter((m) => ids.includes(m.id));
    setListe((l) => l.filter((m) => !ids.includes(m.id)));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await malzemeSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} malzeme silindi`);
    } else {
      setListe((l) => [...kaldirilan, ...l]);
      toast.error(res.error ?? "Silinemedi.");
    }
  }
  async function kopyala(m: Malzeme) {
    const k: Malzeme = {
      ...m,
      id: `MLZ-${Math.floor(1000 + Math.random() * 9000)}`,
      ad: `${m.ad} (kopya)`,
    };
    setListe((l) => [k, ...l]);
    await malzemeKaydet(k);
    toast.success("Malzeme kopyalandı");
  }
  async function kaydet(m: Malzeme) {
    setListe((l) => {
      const i = l.findIndex((x) => x.id === m.id);
      if (i >= 0) {
        const n = [...l];
        n[i] = m;
        return n;
      }
      return [m, ...l];
    });
    await malzemeKaydet(m);
  }

  const sortIkon = (k: SortKey) =>
    sort.key !== k ? (
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    ) : sort.dir === "asc" ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    );
  const SortBaslik = ({
    k,
    children,
    className,
  }: {
    k: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => sortla(k)}
        className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
      >
        {children}
        {sortIkon(k)}
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Araç çubuğu */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Malzeme veya kod ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="w-40">
          <SearchSelect
            items={["Tümü", ...TIPLER]}
            value={tip}
            onValueChange={(v) => setTip(v ?? "Tümü")}
            placeholder="Tip"
          />
        </div>
        <div className="w-36">
          <SearchSelect
            items={["Tümü", "Aktif", "Pasif"]}
            value={durum}
            onValueChange={(v) => setDurum(v ?? "Tümü")}
            placeholder="Durum"
          />
        </div>
        <Button
          className="ml-auto"
          onClick={() => {
            setDuzenlenen(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="size-4" /> Yeni Malzeme
        </Button>
      </div>

      {secili.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{secili.size} seçili</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-rose-600"
            onClick={() => sil([...secili])}
          >
            <Trash2 className="size-3.5" /> Seçilenleri sil
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSecili(new Set())}>
            Temizle
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={tumuSecili}
                  indeterminate={!tumuSecili && baziSecili}
                  onCheckedChange={(v) => tumunuSec(v === true)}
                  aria-label="Tümünü seç"
                />
              </TableHead>
              <SortBaslik k="id">Kod</SortBaslik>
              <SortBaslik k="ad">Malzeme</SortBaslik>
              <SortBaslik k="tip">Tip</SortBaslik>
              <SortBaslik k="birim">Birim</SortBaslik>
              <SortBaslik k="stok" className="text-right">
                Stok
              </SortBaslik>
              <SortBaslik k="birimFiyat" className="text-right">
                Birim Fiyat
              </SortBaslik>
              <SortBaslik k="durum">Durum</SortBaslik>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((m) => (
              <TableRow
                key={m.id}
                data-state={secili.has(m.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => {
                  setDuzenlenen(m);
                  setSheetOpen(true);
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={secili.has(m.id)}
                    onCheckedChange={(v) => secimDegis(m.id, v === true)}
                    aria-label={`${m.ad} seç`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {m.id}
                </TableCell>
                <TableCell className="font-medium">{m.ad}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={TIP_RENK[m.tip]}>
                    {m.tip}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.birim}</TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    m.stok === 0 && "text-rose-600",
                  )}
                >
                  {m.stok}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatTL(m.birimFiyat)}
                </TableCell>
                <TableCell>
                  <Badge variant={m.durum === "Aktif" ? "default" : "secondary"}>
                    {m.durum}
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
                          setDuzenlenen(m);
                          setSheetOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => kopyala(m)}>
                        <Plus className="mr-2 size-4" /> Kopyala
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil([m.id])}
                      >
                        <Trash2 className="mr-2 size-4" /> Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  Malzeme bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtreli.length} malzeme
          {secili.size > 0 ? ` · ${secili.size} seçili` : ""}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Sayfa {aktifSayfa} / {toplamSayfa}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={aktifSayfa <= 1}
            onClick={() => setSayfa((p) => Math.max(1, p - 1))}
            aria-label="Önceki"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={aktifSayfa >= toplamSayfa}
            onClick={() => setSayfa((p) => Math.min(toplamSayfa, p + 1))}
            aria-label="Sonraki"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <MaterialSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        onSave={kaydet}
      />
    </div>
  );
}

function MaterialSheet({
  open,
  onOpenChange,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Malzeme | null;
  onSave: (m: Malzeme) => void;
}) {
  const [form, setForm] = React.useState({
    id: "",
    ad: "",
    tip: "Hammadde" as MalzemeTipi,
    birim: "adet",
    stok: "",
    birimFiyat: "",
    tedarikci: "",
    durum: "Aktif" as "Aktif" | "Pasif",
  });
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        id: item.id,
        ad: item.ad,
        tip: item.tip,
        birim: item.birim,
        stok: String(item.stok),
        birimFiyat: String(item.birimFiyat),
        tedarikci: item.tedarikci ?? "",
        durum: item.durum,
      });
    } else {
      setForm({
        id: "",
        ad: "",
        tip: "Hammadde",
        birim: "adet",
        stok: "",
        birimFiyat: "",
        tedarikci: "",
        durum: "Aktif",
      });
    }
  }, [open, item]);

  function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Malzeme adı gerekli");
      return;
    }
    onSave({
      id: form.id.trim() || `MLZ-${Math.floor(1000 + Math.random() * 9000)}`,
      ad: form.ad.trim(),
      tip: form.tip,
      birim: form.birim,
      stok: Number(form.stok) || 0,
      birimFiyat: Number(form.birimFiyat) || 0,
      tedarikci: form.tedarikci.trim() || undefined,
      durum: form.durum,
    });
    toast.success(item ? "Malzeme güncellendi" : "Malzeme eklendi");
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Malzemeyi Düzenle" : "Yeni Malzeme"}
      icon={LayersIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Malzeme Adı"
          icon={LayersIcon}
          placeholder="Örn. MDF Levha 18mm"
          value={form.ad}
          onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
        />
        <IconInput
          label="Kod"
          icon={ScanTextIcon}
          placeholder="MLZ-0000"
          value={form.id}
          onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <AnimatedField label="Tip" icon={FolderOpenIcon}>
            <SearchSelect
              items={TIPLER}
              value={form.tip}
              onValueChange={(v) => setForm((f) => ({ ...f, tip: (v as MalzemeTipi) ?? "Hammadde" }))}
              placeholder="Tip"
            />
          </AnimatedField>
          <AnimatedField label="Birim" icon={BoxesIcon}>
            <SearchSelect
              items={BIRIMLER}
              value={form.birim}
              onValueChange={(v) => setForm((f) => ({ ...f, birim: v ?? "adet" }))}
              placeholder="Birim"
            />
          </AnimatedField>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Stok"
            icon={BoxesIcon}
            type="number"
            placeholder="0"
            value={form.stok}
            onChange={(e) => setForm((f) => ({ ...f, stok: e.target.value }))}
          />
          <IconInput
            label="Birim Fiyat (₺)"
            icon={TurkishLiraIcon}
            type="number"
            placeholder="0"
            value={form.birimFiyat}
            onChange={(e) =>
              setForm((f) => ({ ...f, birimFiyat: e.target.value }))
            }
          />
        </div>
        <IconInput
          label="Tedarikçi"
          icon={UsersRoundIcon}
          placeholder="Örn. Kastamonu Entegre"
          value={form.tedarikci}
          onChange={(e) =>
            setForm((f) => ({ ...f, tedarikci: e.target.value }))
          }
        />
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
      </div>
    </FormSheet>
  );
}
