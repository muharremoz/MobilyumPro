"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatTL, type Cari, type CariTip } from "@/lib/data";
import { cariSil } from "@/lib/db/actions";

const TIPLER: CariTip[] = ["Müşteri", "Tedarikçi", "Her İkisi"];
const TIP_RENK: Record<CariTip, string> = {
  Müşteri: "bg-blue-100 text-blue-800",
  Tedarikçi: "bg-amber-100 text-amber-800",
  "Her İkisi": "bg-violet-100 text-violet-800",
};
const SAYFA_BOYUT = 8;
type SortKey = "id" | "ad" | "tip" | "sehir" | "bakiye" | "durum";

export function CariList({ cariler }: { cariler: Cari[] }) {
  const router = useRouter();
  const [liste, setListe] = React.useState<Cari[]>(cariler);
  React.useEffect(() => setListe(cariler), [cariler]);
  const [arama, setArama] = React.useState("");
  const [tip, setTip] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "asc" },
  );
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());

  React.useEffect(() => setSayfa(1), [arama, tip, durum]);

  const filtreli = React.useMemo(() => {
    const q = arama.toLowerCase();
    const arr = liste.filter((c) => {
      const ara =
        c.ad.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false);
      const t = tip === "Tümü" || c.tip === tip;
      const d = durum === "Tümü" || c.durum === durum;
      return ara && t && d;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x ?? "").localeCompare(String(y ?? ""), "tr") * yon;
    });
  }, [liste, arama, tip, durum, sort]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
  const sayfaIds = sayfalik.map((c) => c.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  function sortla(k: SortKey) {
    setSort((s) =>
      s.key === k
        ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key: k, dir: "asc" },
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
    const onceki = liste;
    setListe((l) => l.filter((c) => !ids.includes(c.id)));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await cariSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} cari hesap silindi`);
    } else {
      setListe(onceki);
      toast.error(res.error ?? "Silinemedi.");
    }
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari, kod veya e-posta ara..."
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
          nativeButton={false}
          render={<Link href="/cari/yeni" />}
        >
          <Plus className="size-4" /> Yeni Cari
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
              <SortBaslik k="ad">Ad / Unvan</SortBaslik>
              <SortBaslik k="tip">Tip</SortBaslik>
              <SortBaslik k="sehir">Şehir</SortBaslik>
              <SortBaslik k="bakiye" className="text-right">
                Bakiye
              </SortBaslik>
              <SortBaslik k="durum">Durum</SortBaslik>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((c) => (
              <TableRow
                key={c.id}
                data-state={secili.has(c.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => router.push(`/cari/${c.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={secili.has(c.id)}
                    onCheckedChange={(v) => secimDegis(c.id, v === true)}
                    aria-label={`${c.ad} seç`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {c.id}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{c.ad}</div>
                  {c.email && (
                    <div className="text-[11px] text-muted-foreground">
                      {c.email}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={TIP_RENK[c.tip]}>
                    {c.tip}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.sehir ?? "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    c.bakiye < 0 && "text-rose-600",
                    c.bakiye > 0 && "text-emerald-600",
                    c.bakiye === 0 && "text-muted-foreground",
                  )}
                >
                  {formatTL(Math.abs(c.bakiye))}
                  <span className="ml-1 text-[10px] uppercase">
                    {c.bakiye < 0 ? "B" : c.bakiye > 0 ? "A" : ""}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={c.durum === "Aktif" ? "default" : "secondary"}>
                    {c.durum}
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
                        onClick={() => router.push(`/cari/${c.id}`)}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil([c.id])}
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
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Cari hesap bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtreli.length} cari hesap
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
    </div>
  );
}
