"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchSelect } from "@/components/ui/search-select";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { SlidersHorizontalIcon } from "@/components/ui/icons/sliders-horizontal";
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

export type Tanim = { id: string; ad: string; adet: number; durum: "Aktif" | "Pasif" };
export type TabKey =
  | "kategoriler"
  | "markalar"
  | "koleksiyonlar"
  | "renkler"
  | "kumaslar"
  | "birimler";

export const TABS: Record<TabKey, { label: string; tekil: string }> = {
  kategoriler: { label: "Kategoriler", tekil: "Kategori" },
  markalar: { label: "Markalar", tekil: "Marka" },
  koleksiyonlar: { label: "Koleksiyonlar", tekil: "Koleksiyon" },
  renkler: { label: "Renkler", tekil: "Renk" },
  kumaslar: { label: "Kumaşlar", tekil: "Kumaş" },
  birimler: { label: "Birimler", tekil: "Birim" },
};

// Sol menü grupları (alt menü).
export const MENU: { label: string; keys: TabKey[] }[] = [
  { label: "Model", keys: ["kategoriler", "markalar", "koleksiyonlar"] },
  { label: "Özellik", keys: ["renkler", "kumaslar", "birimler"] },
];

const t = (ad: string, adet: number, pasif = false): Tanim => ({
  id: `${ad}-${Math.floor(Math.random() * 100000)}`,
  ad,
  adet,
  durum: pasif ? "Pasif" : "Aktif",
});

const ILK: Record<TabKey, Tanim[]> = {
  kategoriler: [
    t("Oturma Grubu", 24),
    t("Yatak Odası", 18),
    t("Yemek Odası", 12),
    t("Çalışma", 9),
    t("Aksesuar", 31),
  ],
  markalar: [t("Milano", 14), t("Roma", 9), t("Nordic", 21), t("Comfort", 6), t("Elegance", 11)],
  koleksiyonlar: [t("Yaz 2026", 8), t("Klasik", 14), t("Modern", 22), t("Loft", 6)],
  renkler: [t("Antrasit", 33), t("Krem", 27), t("Kahve", 19), t("Bej", 22), t("Gri", 14)],
  kumaslar: [t("Keten", 12), t("Kadife", 9), t("Deri", 17), t("Pamuk", 6), t("Nubuk", 4, true)],
  birimler: [t("Adet", 120), t("Takım", 42), t("m²", 15), t("Metre", 8), t("Set", 5, true)],
};

type SortKey = "ad" | "adet" | "durum";
const SAYFA_BOYUT = 8;

export function DefinitionsPage({
  hideMenu = false,
  tip: tipProp,
  onTipChange,
}: {
  /** Sol gruplu menüyü gizler (üst kapsayıcı kendi menüsünü kullanır). */
  hideMenu?: boolean;
  /** Dış kontrollü tip (verilirse iç state yerine bu kullanılır). */
  tip?: TabKey;
  onTipChange?: (k: TabKey) => void;
} = {}) {
  const [data, setData] = React.useState<Record<TabKey, Tanim[]>>(ILK);
  const [tabState, setTabState] = React.useState<TabKey>("kategoriler");
  const tab = tipProp ?? tabState;
  const setTab = (k: TabKey) => {
    setTabState(k);
    onTipChange?.(k);
  };
  const [arama, setArama] = React.useState("");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "ad",
    dir: "asc",
  });
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sayfa, setSayfa] = React.useState(1);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Tanim | null>(null);
  const [acikGrup, setAcikGrup] = React.useState<Set<string>>(
    () => new Set(MENU.map((g) => g.label)),
  );

  const aktifTab = TABS[tab];
  const liste = data[tab];

  // Tip değişince filtre/seçim/sayfa sıfırla; filtre değişince sayfaya dön.
  React.useEffect(() => {
    setArama("");
    setDurum("Tümü");
    setSecili(new Set());
    setSayfa(1);
  }, [tab]);
  React.useEffect(() => setSayfa(1), [arama, durum]);

  function grupAcKapa(label: string) {
    setAcikGrup((s) => {
      const n = new Set(s);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });
  }

  const filtreli = React.useMemo(() => {
    const q = arama.toLowerCase();
    const arr = liste.filter((x) => {
      const ara = x.ad.toLowerCase().includes(q);
      const dur = durum === "Tümü" || x.durum === durum;
      return ara && dur;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, arama, durum, sort]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
  const sayfaIds = sayfalik.map((x) => x.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  function sortla(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
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

  function kaydet(degerler: { ad: string; durum: "Aktif" | "Pasif" }) {
    setData((d) => {
      const arr = d[tab];
      if (duzenlenen) {
        return {
          ...d,
          [tab]: arr.map((x) =>
            x.id === duzenlenen.id ? { ...x, ...degerler } : x,
          ),
        };
      }
      return {
        ...d,
        [tab]: [
          {
            id: `${degerler.ad}-${Math.floor(Math.random() * 100000)}`,
            adet: 0,
            ...degerler,
          },
          ...arr,
        ],
      };
    });
    toast.success(
      duzenlenen ? `${aktifTab.tekil} güncellendi` : `${aktifTab.tekil} eklendi`,
    );
  }

  function sil(ids: string[]) {
    setData((d) => ({ ...d, [tab]: d[tab].filter((x) => !ids.includes(x.id)) }));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    toast.success(`${ids.length} kayıt silindi`);
  }

  const sortIkon = (key: SortKey) =>
    sort.key !== key ? (
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
    <div className="flex gap-4">
      {/* Sol dikey menü — gruplu (alt menü) */}
      {!hideMenu && (
      <aside className="w-48 shrink-0">
        <nav className="flex flex-col gap-1 rounded-md border bg-card p-1.5">
          {MENU.map((g) => {
            const acik = acikGrup.has(g.label);
            return (
              <div key={g.label}>
                <button
                  type="button"
                  onClick={() => grupAcKapa(g.label)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase transition-colors hover:text-foreground"
                >
                  <span>{g.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      !acik && "-rotate-90",
                    )}
                  />
                </button>
                {acik && (
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {g.keys.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setTab(k);
                          setArama("");
                        }}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                          tab === k
                            ? "bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        )}
                      >
                        <span>{TABS[k].label}</span>
                        <span className="text-xs text-muted-foreground/70">
                          {data[k].length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      )}

      {/* Sağ içerik */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Araç çubuğu */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`${aktifTab.label} içinde ara...`}
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              className="h-9 pl-9"
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
            <Plus className="size-4" /> Yeni {aktifTab.tekil}
          </Button>
        </div>

        {/* Toplu işlem çubuğu */}
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

        {/* Tablo */}
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
                <SortBaslik k="ad">Ad</SortBaslik>
                <SortBaslik k="adet" className="text-right">
                  Kullanım
                </SortBaslik>
                <SortBaslik k="durum">Durum</SortBaslik>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sayfalik.map((x) => (
                <TableRow
                  key={x.id}
                  data-state={secili.has(x.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => {
                    setDuzenlenen(x);
                    setSheetOpen(true);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={secili.has(x.id)}
                      onCheckedChange={(v) => secimDegis(x.id, v === true)}
                      aria-label={`${x.ad} seç`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{x.ad}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {x.adet}
                  </TableCell>
                  <TableCell>
                    <Badge variant={x.durum === "Aktif" ? "default" : "secondary"}>
                      {x.durum}
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
                            setDuzenlenen(x);
                            setSheetOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 size-4" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => sil([x.id])}
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
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Kayıt bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sayfalama */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtreli.length} kayıt
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

      <DefinitionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        tekil={aktifTab.tekil}
        onSave={kaydet}
      />
    </div>
  );
}

function DefinitionSheet({
  open,
  onOpenChange,
  item,
  tekil,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Tanim | null;
  tekil: string;
  onSave: (v: { ad: string; durum: "Aktif" | "Pasif" }) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">("Aktif");
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    setAd(item?.ad ?? "");
    setDurum(item?.durum ?? "Aktif");
  }, [open, item]);

  function kaydet() {
    if (!ad.trim()) {
      toast.error(`${tekil} adı gerekli`);
      return;
    }
    onSave({ ad: ad.trim(), durum });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? `${tekil} Düzenle` : `Yeni ${tekil}`}
      icon={SlidersHorizontalIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label={`${tekil} Adı`}
          icon={SlidersHorizontalIcon}
          placeholder={`Örn. ${tekil} adı`}
          value={ad}
          onChange={(e) => setAd(e.target.value)}
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
