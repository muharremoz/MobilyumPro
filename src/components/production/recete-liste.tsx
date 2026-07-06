"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListHeader } from "@/components/ui/list-header";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatTL, type Malzeme, type Model, type Parca } from "@/lib/data";
import { parcaSil, receteKopyala } from "@/lib/db/actions";

const KATEGORILER = [
  "Karyola",
  "Komidin",
  "Şifonyer",
  "Gardırop",
  "Ayna",
  "Sehpa",
  "Koltuk",
  "Diğer",
];
const SAYFA_BOYUT = 10;

type SortKey = "ad" | "kategori" | "bilesen" | "maliyet" | "kullanim" | "durum";

/** Reçete maliyeti — fire dahil, özyinelemeli (döngü korumalı). */
export function receteMaliyeti(
  satirlar: Parca["recete"],
  malzemeMap: Map<string, Malzeme>,
  parcaMap: Map<string, Parca>,
  gezilen = new Set<string>(),
): number {
  let toplam = 0;
  for (const s of satirlar) {
    const brut = s.miktar * (1 + (s.fire ?? 0) / 100);
    if (s.bilesen.tip === "malzeme") {
      toplam += (malzemeMap.get(s.bilesen.ref)?.birimFiyat ?? 0) * brut;
    } else if (!gezilen.has(s.bilesen.ref)) {
      const alt = parcaMap.get(s.bilesen.ref);
      if (alt) {
        const g = new Set(gezilen);
        g.add(s.bilesen.ref);
        toplam += receteMaliyeti(alt.recete, malzemeMap, parcaMap, g) * brut;
      }
    }
  }
  return toplam;
}

export function ReceteListe({
  parcalar,
  malzemeler,
  modeller,
}: {
  parcalar: Parca[];
  malzemeler: Malzeme[];
  modeller: Model[];
}) {
  const router = useRouter();
  const [liste, setListe] = React.useState<Parca[]>(parcalar);
  const [adFiltre, setAdFiltre] = React.useState("");
  const [kategori, setKategori] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "ad", dir: "asc" },
  );
  const [sayfa, setSayfa] = React.useState(1);
  const [kopyaKaynak, setKopyaKaynak] = React.useState<Parca | null>(null);
  const [kopyaAd, setKopyaAd] = React.useState("");

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const parcaMap = React.useMemo(
    () => new Map(liste.map((p) => [p.id, p])),
    [liste],
  );

  // Kullanım sayısı: modellerde + başka reçetelerde alt reçete olarak.
  const kullanim = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const u of modeller)
      for (const ps of u.parcalar ?? [])
        m.set(ps.parcaId, (m.get(ps.parcaId) ?? 0) + 1);
    for (const p of liste)
      for (const r of p.recete)
        if (r.bilesen.tip === "parca")
          m.set(r.bilesen.ref, (m.get(r.bilesen.ref) ?? 0) + 1);
    return m;
  }, [liste, modeller]);

  React.useEffect(() => setSayfa(1), [adFiltre, kategori, durum]);

  const satirlar = React.useMemo(() => {
    const q = adFiltre.toLocaleLowerCase("tr");
    const arr = liste
      .filter(
        (p) =>
          (!q || p.ad.toLocaleLowerCase("tr").includes(q)) &&
          (kategori === "Tümü" || p.kategori === kategori) &&
          (durum === "Tümü" || p.durum === durum),
      )
      .map((p) => ({
        p,
        maliyet: receteMaliyeti(p.recete, malzemeMap, parcaMap),
        kullanimSayisi: kullanim.get(p.id) ?? 0,
      }));
    const yon = sort.dir === "asc" ? 1 : -1;
    return arr.sort((a, b) => {
      const deger = (x: (typeof arr)[number]) =>
        sort.key === "ad"
          ? x.p.ad
          : sort.key === "kategori"
            ? x.p.kategori
            : sort.key === "bilesen"
              ? x.p.recete.length
              : sort.key === "maliyet"
                ? x.maliyet
                : sort.key === "kullanim"
                  ? x.kullanimSayisi
                  : x.p.durum;
      const va = deger(a);
      const vb = deger(b);
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
  }, [liste, adFiltre, kategori, durum, sort, malzemeMap, parcaMap, kullanim]);

  const toplamSayfa = Math.max(1, Math.ceil(satirlar.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = satirlar.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );

  async function sil(p: Parca) {
    const res = await parcaSil([p.id]);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    setListe((l) => l.filter((x) => x.id !== p.id));
    toast.success("Reçete silindi");
  }

  async function kopyala() {
    if (!kopyaKaynak) return;
    const res = await receteKopyala(kopyaKaynak.id, kopyaAd);
    setKopyaKaynak(null);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kopyalanamadı.");
      return;
    }
    toast.success("Reçete kopyalandı");
    router.push(`/uretim/recete/${res.id}`);
  }

  // ── Kolon başlığı: sırala + filtre popover'ı ──────────────────────────
  const sortIkon = (k: SortKey) =>
    sort.key !== k ? (
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    ) : sort.dir === "asc" ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    );
  const filtreAktif = (k: SortKey) =>
    k === "ad"
      ? adFiltre !== ""
      : k === "kategori"
        ? kategori !== "Tümü"
        : k === "durum"
          ? durum !== "Tümü"
          : false;
  const filtreTemizle = (k: SortKey) => {
    if (k === "ad") setAdFiltre("");
    else if (k === "kategori") setKategori("Tümü");
    else if (k === "durum") setDurum("Tümü");
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
  }) => (
    <TableHead className={className}>
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 hover:text-foreground",
                className?.includes("text-right") && "flex-row-reverse",
              )}
            >
              {children}
              {sortIkon(k)}
              {filtreAktif(k) && (
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
          {(k === "ad" || k === "kategori" || k === "durum") && (
            <>
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
              {(k === "kategori" || k === "durum") && (
                <div className="grid max-h-56 gap-0.5 overflow-auto">
                  {(k === "kategori"
                    ? ["Tümü", ...KATEGORILER]
                    : ["Tümü", "Aktif", "Pasif"]
                  ).map((v) => {
                    const secili = k === "kategori" ? kategori : durum;
                    return (
                      <button
                        key={v}
                        type="button"
                        className={ogeCls(secili === v)}
                        onClick={() =>
                          k === "kategori" ? setKategori(v) : setDurum(v)
                        }
                      >
                        {v}
                        {secili === v && <Check className="ml-auto size-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {filtreAktif(k) && (
                <>
                  <div className="my-1.5 h-px bg-border" />
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                    onClick={() => filtreTemizle(k)}
                  >
                    <Trash2 className="size-3.5" /> Filtreyi temizle
                  </button>
                </>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Reçeteler">
          <Button
            nativeButton={false}
            render={<Link href="/uretim/recete/yeni" />}
          >
            Yeni Reçete
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <SortBaslik k="ad">Reçete</SortBaslik>
              <SortBaslik k="kategori">Kategori</SortBaslik>
              <SortBaslik k="bilesen" className="text-right">
                Bileşen
              </SortBaslik>
              <SortBaslik k="maliyet" className="text-right">
                Maliyet
              </SortBaslik>
              <SortBaslik k="kullanim" className="text-right">
                Kullanım
              </SortBaslik>
              <SortBaslik k="durum">Durum</SortBaslik>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map(({ p, maliyet, kullanimSayisi }) => (
              <ContextMenu key={p.id}>
                <ContextMenuTrigger
                  render={
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => router.push(`/uretim/recete/${p.id}`)}
                    />
                  }
                >
                  <TableCell className="font-medium">{p.ad}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.kategori}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {p.recete.length}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatTL(maliyet)}
                  </TableCell>
                  <TableCell className="text-right">
                    {kullanimSayisi > 0 ? (
                      <Badge variant="secondary" className="tabular-nums">
                        {kullanimSayisi} yerde
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.durum === "Aktif" ? "default" : "secondary"}>
                      {p.durum}
                    </Badge>
                  </TableCell>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  <ContextMenuItem
                    onClick={() => router.push(`/uretim/recete/${p.id}`)}
                  >
                    <Pencil className="mr-2 size-4" /> Düzenle
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      setKopyaAd(`${p.ad} (kopya)`);
                      setKopyaKaynak(p);
                    }}
                  >
                    <Copy className="mr-2 size-4" /> Kopyala
                  </ContextMenuItem>
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => sil(p)}
                  >
                    <Trash2 className="mr-2 size-4" /> Sil
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Reçete bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{satirlar.length} reçete</span>
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

      {/* Kopyala dialogu */}
      <Dialog
        open={kopyaKaynak !== null}
        onOpenChange={(v) => !v && setKopyaKaynak(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Copy className="size-4 text-muted-foreground" /> Reçeteyi Kopyala
            </DialogTitle>
            <DialogDescription>
              &quot;{kopyaKaynak?.ad}&quot; tüm bileşenleriyle yeni bir reçete
              olarak kopyalanır ve düzenleme sayfası açılır.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Yeni reçete adı"
            value={kopyaAd}
            onChange={(e) => setKopyaAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void kopyala();
              }
            }}
          />
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKopyaKaynak(null)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={kopyala} disabled={!kopyaAd.trim()}>
              <Check className="size-3.5" /> Kopyala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
