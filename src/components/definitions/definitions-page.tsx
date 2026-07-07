"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { ListHeader } from "@/components/ui/list-header";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "ad", label: "Ad", aciklama: "Tanımın adı.", kilitli: true },
  {
    key: "adet",
    label: "Kullanım",
    aciklama: "Bu tanımı kullanan kayıt sayısı.",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function DefinitionsPage({
  hideMenu = false,
  tip: tipProp,
  onTipChange,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  /** Sol gruplu menüyü gizler (üst kapsayıcı kendi menüsünü kullanır). */
  hideMenu?: boolean;
  /** Dış kontrollü tip (verilirse iç state yerine bu kullanılır). */
  tip?: TabKey;
  onTipChange?: (k: TabKey) => void;
  /** Kolon ayarları (liste_ayar "tanimlamalar"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
} = {}) {
  const [data, setData] = React.useState<Record<TabKey, Tanim[]>>(ILK);
  const [tabState, setTabState] = React.useState<TabKey>("kategoriler");
  const tab = tipProp ?? tabState;
  const setTab = (k: TabKey) => {
    setTabState(k);
    onTipChange?.(k);
  };
  const [arama, setArama] = React.useState("");
  // Kolon filtreleri (başlık popover'larından)
  const [adFiltre, setAdFiltre] = React.useState("");
  const [adetAralik, setAdetAralik] = React.useState({ min: "", max: "" });
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

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "tanimlamalar",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const aktifTab = TABS[tab];
  const liste = data[tab];

  // Tip değişince filtre/seçim/sayfa sıfırla; filtre değişince sayfaya dön.
  React.useEffect(() => {
    setArama("");
    setAdFiltre("");
    setAdetAralik({ min: "", max: "" });
    setDurum("Tümü");
    setSecili(new Set());
    setSayfa(1);
  }, [tab]);
  React.useEffect(
    () => setSayfa(1),
    [arama, adFiltre, adetAralik, durum],
  );

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
    const qAd = adFiltre.toLowerCase();
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((x) => {
      const ara = x.ad.toLowerCase().includes(q);
      const ad = x.ad.toLowerCase().includes(qAd);
      const adet = arada(x.adet, adetAralik.min, adetAralik.max);
      const dur = durum === "Tümü" || x.durum === durum;
      return ara && ad && adet && dur;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, arama, adFiltre, adetAralik, durum, sort]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
  const sayfaIds = sayfalik.map((x) => x.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

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

  // ── Kolon başlığı: sırala + filtre popover'ı (proje standardı) ──────────
  const sortIkon = (key: SortKey) =>
    sort.key !== key ? (
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    ) : sort.dir === "asc" ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    );

  const kolonFiltreAktif = (k: SortKey) => {
    if (k === "ad") return adFiltre !== "";
    if (k === "adet") return adetAralik.min !== "" || adetAralik.max !== "";
    return durum !== "Tümü";
  };
  const kolonFiltreTemizle = (k: SortKey) => {
    if (k === "ad") setAdFiltre("");
    else if (k === "adet") setAdetAralik({ min: "", max: "" });
    else setDurum("Tümü");
  };

  const ogeCls = (seciliMi: boolean) =>
    cn(
      "flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
      seciliMi && "bg-accent/60 font-medium",
    );

  const SortBaslik = ({
    k,
    children,
    className,
  }: {
    k: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => {
    const aktif = kolonFiltreAktif(k);
    return (
      <TableHead className={className}>
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
              >
                {children}
                {sortIkon(k)}
                {aktif && (
                  <span className="ml-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            }
          />
          <PopoverContent align="start" className="w-56 gap-0 p-1.5 text-left">
            <p className="px-1.5 pt-0.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Sırala
            </p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                className={cn(
                  ogeCls(sort.key === k && sort.dir === "asc"),
                  "justify-center",
                )}
                onClick={() => setSort({ key: k, dir: "asc" })}
              >
                <ArrowUpNarrowWide className="size-4" /> Artan
              </button>
              <button
                type="button"
                className={cn(
                  ogeCls(sort.key === k && sort.dir === "desc"),
                  "justify-center",
                )}
                onClick={() => setSort({ key: k, dir: "desc" })}
              >
                <ArrowDownWideNarrow className="size-4" /> Azalan
              </button>
            </div>

            <div className="my-1.5 h-px bg-border" />
            <p className="px-1.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Filtre
            </p>

            {k === "ad" && (
              <Input
                autoFocus
                placeholder="İçeren metin..."
                value={adFiltre}
                onChange={(e) => setAdFiltre(e.target.value)}
                className="h-8"
              />
            )}
            {k === "adet" && (
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="number"
                  placeholder="En az"
                  value={adetAralik.min}
                  onChange={(e) =>
                    setAdetAralik((a) => ({ ...a, min: e.target.value }))
                  }
                  className="h-8 tabular-nums"
                />
                <Input
                  type="number"
                  placeholder="En çok"
                  value={adetAralik.max}
                  onChange={(e) =>
                    setAdetAralik((a) => ({ ...a, max: e.target.value }))
                  }
                  className="h-8 tabular-nums"
                />
              </div>
            )}
            {k === "durum" && (
              <div className="grid gap-0.5">
                {["Tümü", "Aktif", "Pasif"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={ogeCls(durum === v)}
                    onClick={() => setDurum(v)}
                  >
                    {v}
                    {durum === v && <Check className="ml-auto size-4" />}
                  </button>
                ))}
              </div>
            )}

            {aktif && (
              <>
                <div className="my-1.5 h-px bg-border" />
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                  onClick={() => kolonFiltreTemizle(k)}
                >
                  <Trash2 className="size-3.5" /> Filtreyi temizle
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </TableHead>
    );
  };

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

        {/* Tablo — proje standardı liste kartı */}
        <div className="overflow-hidden rounded-md border bg-card">
          <ListHeader title={aktifTab.label}>
            <div className="relative w-56">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${aktifTab.label} içinde ara...`}
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
            {yonetici && <KolonAyarButonu kolon={kolon} />}
            <Button
              size="sm"
              onClick={() => {
                setDuzenlenen(null);
                setSheetOpen(true);
              }}
            >
              <Plus className="size-4" /> Yeni {aktifTab.tekil}
            </Button>
          </ListHeader>
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
                {kolon.temelGorunur("adet") && (
                  <SortBaslik k="adet" className="text-right">
                    Kullanım
                  </SortBaslik>
                )}
                {kolon.temelGorunur("durum") && (
                  <SortBaslik k="durum">Durum</SortBaslik>
                )}
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
                  {kolon.temelGorunur("adet") && (
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {x.adet}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("durum") && (
                    <TableCell>
                      <Badge
                        variant={x.durum === "Aktif" ? "default" : "secondary"}
                      >
                        {x.durum}
                      </Badge>
                    </TableCell>
                  )}
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
                    colSpan={2 + kolon.gorunurTemelSayisi}
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

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
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
