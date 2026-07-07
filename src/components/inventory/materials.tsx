"use client";

import * as React from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
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
import { ListHeader } from "@/components/ui/list-header";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatTL, type Malzeme, type MalzemeTipi } from "@/lib/data";
import { malzemeKaydet, malzemeSil } from "@/lib/db/actions";

const TIPLER: MalzemeTipi[] = ["Hammadde", "Yarı Mamul", "Yardımcı"];
const BIRIMLER = ["adet", "m", "m²", "m³", "kg", "lt", "takım"];
const TIP_RENK: Record<string, string> = {
  Hammadde: "bg-blue-100 text-blue-800",
  "Yarı Mamul": "bg-violet-100 text-violet-800",
  Yardımcı: "bg-amber-100 text-amber-800",
};
const TIP_RENK_VARSAYILAN = "bg-slate-100 text-slate-700";
const SAYFA_BOYUT = 8;
type SortKey = "id" | "ad" | "tip" | "birim" | "stok" | "birimFiyat" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "kod", label: "Kod", aciklama: "Malzeme kodu (MLZ-####)." },
  { key: "ad", label: "Malzeme", aciklama: "Malzemenin adı.", kilitli: true },
  { key: "tip", label: "Tip", aciklama: "Hammadde / Yarı Mamul / Yardımcı." },
  {
    key: "birim",
    label: "Birim",
    aciklama: "Stok takip birimi (adet, m², kg...).",
  },
  { key: "stok", label: "Stok", aciklama: "Eldeki miktar." },
  {
    key: "birimFiyat",
    label: "Birim Fiyat",
    aciklama: "Birim başına maliyet (TL).",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: (KolonTanim & {
  hucre: (m: Malzeme) => React.ReactNode;
})[] = [
  {
    key: "tedarikci",
    label: "Tedarikçi",
    aciklama: "Malzemenin alındığı tedarikçi firma.",
    hucre: (m) =>
      m.tedarikci ?? <span className="text-muted-foreground">—</span>,
  },
];

export function Materials({
  malzemeler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  malzemeler: Malzeme[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const [liste, setListe] = React.useState<Malzeme[]>(malzemeler);
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [tip, setTip] = React.useState("Tümü");
  const [birimF, setBirimF] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"stok" | "birimFiyat", { min: string; max: string }>
  >({ stok: { min: "", max: "" }, birimFiyat: { min: "", max: "" } });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "id",
    dir: "asc",
  });
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Malzeme | null>(null);
  const [tipler, setTipler] = React.useState<string[]>(TIPLER);

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "malzemeler",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });
  const gorunurEk = EK_KOLONLAR.filter((k) => kolon.ekGorunur(k.key));

  function tipEkle(t: string) {
    const ad = t.trim();
    if (!ad) return;
    setTipler((prev) => (prev.includes(ad) ? prev : [...prev, ad]));
  }

  React.useEffect(
    () => setSayfa(1),
    [metinFiltre, tip, birimF, durum, sayiFiltre],
  );

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((m) => {
      const kod = m.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = m.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const t = tip === "Tümü" || m.tip === tip;
      const b = birimF === "Tümü" || m.birim === birimF;
      const d = durum === "Tümü" || m.durum === durum;
      const stk = arada(m.stok, sayiFiltre.stok.min, sayiFiltre.stok.max);
      const fiy = arada(
        m.birimFiyat,
        sayiFiltre.birimFiyat.min,
        sayiFiltre.birimFiyat.max,
      );
      return kod && ad && t && b && d && stk && fiy;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, metinFiltre, tip, birimF, durum, sayiFiltre, sort]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
  const sayfaIds = sayfalik.map((m) => m.id);
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

  // ── Kolon başlığı: sırala + filtre popover'ı (proje standardı) ──────────
  const sortIkon = (k: SortKey) =>
    sort.key !== k ? (
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    ) : sort.dir === "asc" ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    );

  const kolonFiltreAktif = (k: SortKey) => {
    if (k === "id") return metinFiltre.id !== "";
    if (k === "ad") return metinFiltre.ad !== "";
    if (k === "tip") return tip !== "Tümü";
    if (k === "birim") return birimF !== "Tümü";
    if (k === "durum") return durum !== "Tümü";
    return sayiFiltre[k].min !== "" || sayiFiltre[k].max !== "";
  };
  const kolonFiltreTemizle = (k: SortKey) => {
    if (k === "id" || k === "ad") setMetinFiltre((f) => ({ ...f, [k]: "" }));
    else if (k === "tip") setTip("Tümü");
    else if (k === "birim") setBirimF("Tümü");
    else if (k === "durum") setDurum("Tümü");
    else setSayiFiltre((f) => ({ ...f, [k]: { min: "", max: "" } }));
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
    const listeSecim =
      k === "tip"
        ? { deger: tip, ayarla: setTip, secenekler: ["Tümü", ...tipler] }
        : k === "birim"
          ? {
              deger: birimF,
              ayarla: setBirimF,
              secenekler: ["Tümü", ...BIRIMLER],
            }
          : k === "durum"
            ? {
                deger: durum,
                ayarla: setDurum,
                secenekler: ["Tümü", "Aktif", "Pasif"],
              }
            : null;
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

            {(k === "id" || k === "ad") && (
              <Input
                autoFocus
                placeholder="İçeren metin..."
                value={metinFiltre[k]}
                onChange={(e) =>
                  setMetinFiltre((f) => ({ ...f, [k]: e.target.value }))
                }
                className="h-8"
              />
            )}
            {(k === "stok" || k === "birimFiyat") && (
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="number"
                  placeholder="En az"
                  value={sayiFiltre[k].min}
                  onChange={(e) =>
                    setSayiFiltre((f) => ({
                      ...f,
                      [k]: { ...f[k], min: e.target.value },
                    }))
                  }
                  className="h-8 tabular-nums"
                />
                <Input
                  type="number"
                  placeholder="En çok"
                  value={sayiFiltre[k].max}
                  onChange={(e) =>
                    setSayiFiltre((f) => ({
                      ...f,
                      [k]: { ...f[k], max: e.target.value },
                    }))
                  }
                  className="h-8 tabular-nums"
                />
              </div>
            )}
            {listeSecim && (
              <div className="grid max-h-56 gap-0.5 overflow-auto">
                {listeSecim.secenekler.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={ogeCls(listeSecim.deger === v)}
                    onClick={() => listeSecim.ayarla(v)}
                  >
                    {v}
                    {listeSecim.deger === v && (
                      <Check className="ml-auto size-4" />
                    )}
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
    <div className="flex flex-col gap-3">
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
        <ListHeader title="Malzemeler">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            onClick={() => {
              setDuzenlenen(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" /> Yeni Malzeme
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
              {kolon.temelGorunur("kod") && <SortBaslik k="id">Kod</SortBaslik>}
              <SortBaslik k="ad">Malzeme</SortBaslik>
              {kolon.temelGorunur("tip") && (
                <SortBaslik k="tip">Tip</SortBaslik>
              )}
              {kolon.temelGorunur("birim") && (
                <SortBaslik k="birim">Birim</SortBaslik>
              )}
              {kolon.temelGorunur("stok") && (
                <SortBaslik k="stok" className="text-right">
                  Stok
                </SortBaslik>
              )}
              {kolon.temelGorunur("birimFiyat") && (
                <SortBaslik k="birimFiyat" className="text-right">
                  Birim Fiyat
                </SortBaslik>
              )}
              {gorunurEk.map((k) => (
                <TableHead key={k.key}>{k.label}</TableHead>
              ))}
              {kolon.temelGorunur("durum") && (
                <SortBaslik k="durum">Durum</SortBaslik>
              )}
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
                {kolon.temelGorunur("kod") && (
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {m.id}
                  </TableCell>
                )}
                <TableCell className="font-medium">{m.ad}</TableCell>
                {kolon.temelGorunur("tip") && (
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={TIP_RENK[m.tip] ?? TIP_RENK_VARSAYILAN}
                    >
                      {m.tip}
                    </Badge>
                  </TableCell>
                )}
                {kolon.temelGorunur("birim") && (
                  <TableCell className="text-muted-foreground">
                    {m.birim}
                  </TableCell>
                )}
                {kolon.temelGorunur("stok") && (
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      m.stok === 0 && "text-rose-600",
                    )}
                  >
                    {m.stok}
                  </TableCell>
                )}
                {kolon.temelGorunur("birimFiyat") && (
                  <TableCell className="text-right tabular-nums">
                    {formatTL(m.birimFiyat)}
                  </TableCell>
                )}
                {gorunurEk.map((k) => (
                  <TableCell key={k.key}>{k.hucre(m)}</TableCell>
                ))}
                {kolon.temelGorunur("durum") && (
                  <TableCell>
                    <Badge
                      variant={m.durum === "Aktif" ? "default" : "secondary"}
                    >
                      {m.durum}
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
                  colSpan={2 + kolon.gorunurTemelSayisi + gorunurEk.length}
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
        tipler={tipler}
        onTipEkle={tipEkle}
        onSave={kaydet}
      />

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}

function MaterialSheet({
  open,
  onOpenChange,
  item,
  tipler,
  onTipEkle,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Malzeme | null;
  tipler: string[];
  onTipEkle: (t: string) => void;
  onSave: (m: Malzeme) => void;
}) {
  const [yeniTipMod, setYeniTipMod] = React.useState(false);
  const [yeniTip, setYeniTip] = React.useState("");

  function tipKaydet() {
    const ad = yeniTip.trim();
    if (!ad) return;
    onTipEkle(ad);
    setForm((f) => ({ ...f, tip: ad as MalzemeTipi }));
    setYeniTip("");
    setYeniTipMod(false);
  }

  React.useEffect(() => {
    if (!open) {
      setYeniTipMod(false);
      setYeniTip("");
    }
  }, [open]);
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
              items={tipler}
              value={form.tip}
              onValueChange={(v) => setForm((f) => ({ ...f, tip: (v as MalzemeTipi) ?? "Hammadde" }))}
              placeholder="Tip"
              addLabel="Yeni tip ekle"
              onAdd={() => {
                setYeniTip("");
                setYeniTipMod(true);
              }}
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

      <Dialog open={yeniTipMod} onOpenChange={setYeniTipMod}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <FolderOpenIcon size={16} className="text-muted-foreground" />
              Yeni Tip
            </DialogTitle>
            <DialogDescription>
              Malzeme tipi ekleyin; eklenince otomatik seçilir.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Örn. Sarf Malzeme"
            value={yeniTip}
            onChange={(e) => setYeniTip(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tipKaydet();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setYeniTipMod(false)}>
              İptal
            </Button>
            <Button onClick={tipKaydet} disabled={!yeniTip.trim()}>
              <Check className="size-4" /> Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormSheet>
  );
}
