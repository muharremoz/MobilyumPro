"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  History,
  Layers,
  ShoppingCart,
  Power,
  Boxes,
  Banknote,
  Hammer,
  Hash,
  Type,
  Link2,
  CopyPlus,
  Download,
  FolderInput,
  Tags,
  Star,
  Archive,
  Check,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Columns3,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListHeader } from "@/components/ui/list-header";
import { FormSheet } from "@/components/ui/form-sheet";
import { SheetClose, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL, type Model } from "@/lib/data";
import { modelKaydet, modelSil, listeKolonKaydet } from "@/lib/db/actions";

const KATEGORILER = [
  "Oturma Grubu",
  "Yatak Odası",
  "Yemek Odası",
  "Çalışma",
  "Aksesuar",
];
const SAYFA_BOYUT = 8;

type SortKey = "id" | "ad" | "kategori" | "fiyat" | "stok" | "durum";
type SortDir = "asc" | "desc";

function StokHucre({ stok }: { stok: number }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        stok === 0 ? "text-rose-600" : stok <= 5 ? "text-amber-600" : "",
      )}
    >
      {stok}
    </span>
  );
}

/** Listeye eklenebilecek isteğe bağlı kolonlar. "Herkes görsün" işaretlenirse
 *  seçim DB'de (liste_ayar) saklanır; aksi halde yalnızca bu tarayıcıda
 *  (localStorage) geçerlidir. */
const EK_KOLONLAR: {
  key: string;
  label: string;
  aciklama: string;
  sag?: boolean;
  hucre: (u: Model) => React.ReactNode;
}[] = [
  {
    key: "marka",
    label: "Marka",
    aciklama: "Modelin üretici markası (Tanımlamalar → Markalar).",
    hucre: (u) =>
      u.marka ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "barkod",
    label: "Barkod",
    aciklama: "Modelin barkod numarası; etiket ve hızlı arama için.",
    hucre: (u) =>
      u.barkod ? (
        <span className="font-mono text-xs text-muted-foreground">
          {u.barkod}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "minStok",
    label: "Min. Stok",
    aciklama: "Kritik stok eşiği; stok bu değerin altına düşünce uyarılır.",
    sag: true,
    hucre: (u) =>
      u.minStok != null ? (
        <span className="tabular-nums">{u.minStok}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "agirlik",
    label: "Ağırlık",
    aciklama: "Birim ağırlık (kg); sevkiyat ve yük hesapları için.",
    sag: true,
    hucre: (u) =>
      u.agirlik != null ? (
        <span className="tabular-nums">{u.agirlik} kg</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

/** Listenin temel kolonları — Model (kimlik) hariç aç/kapa yapılabilir;
 *  gizleme herkes için geçerlidir (liste_ayar.gizliTemel). */
const TEMEL_KOLONLAR: {
  key: string;
  label: string;
  aciklama: string;
  kilitli?: boolean;
}[] = [
  { key: "kod", label: "Kod", aciklama: "Model kodu (URN-####); benzersiz kimlik." },
  { key: "model", label: "Model", aciklama: "Modelin adı.", kilitli: true },
  { key: "kategori", label: "Kategori", aciklama: "Modelin bağlı olduğu kategori." },
  { key: "fiyat", label: "Fiyat", aciklama: "Satış fiyatı (TL)." },
  { key: "stok", label: "Stok", aciklama: "Eldeki adet; kritik seviyede renklenir." },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif satış durumu." },
];

export function ProductsTable({
  urunler,
  initialKategori,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  urunler: Model[];
  initialKategori?: string;
  /** Seçili ek kolonlar + gören kullanıcılar + gizlenen temel kolonlar (liste_ayar). */
  kolonAyari?: {
    kolonlar: string[];
    kullanicilar: string[];
    gizliTemel: string[];
  };
  /** Kullanıcı combobox'ı için liste. */
  kullanicilar?: { id: string; ad: string }[];
  /** Görünürlük hesabında "ben" (TODO: oturumdan gelecek). */
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const [liste, setListe] = React.useState<Model[]>(urunler);
  // Tek ayar: seçili ek kolonlar + bu kolonları gören kullanıcılar (DB).
  const [ekKolonSet, setEkKolonSet] = React.useState<Set<string>>(
    () => new Set(kolonAyari?.kolonlar ?? []),
  );
  const [kolonKullanicilar, setKolonKullanicilar] = React.useState<string[]>(
    () => [...(kolonAyari?.kullanicilar ?? [])],
  );
  const [gizliTemel, setGizliTemel] = React.useState<Set<string>>(
    () => new Set(kolonAyari?.gizliTemel ?? []),
  );
  const [kolonSheet, setKolonSheet] = React.useState(false);

  // Ek kolonlar yalnızca listede seçili kullanıcılara görünür.
  const gorunurEk =
    mevcutKullaniciId && kolonKullanicilar.includes(mevcutKullaniciId)
      ? EK_KOLONLAR.filter((k) => ekKolonSet.has(k.key))
      : [];
  // Gizlenmemiş temel kolonlar (herkes için geçerli).
  const temelGorunur = (key: string) => !gizliTemel.has(key);
  const gorunurTemelSayisi = TEMEL_KOLONLAR.filter((k) =>
    temelGorunur(k.key),
  ).length;

  async function ayarYaz(
    kolonlar: Set<string>,
    kisiler: string[],
    gizli: Set<string>,
  ): Promise<void> {
    const oncekiK = new Set(ekKolonSet);
    const oncekiU = [...kolonKullanicilar];
    const oncekiG = new Set(gizliTemel);
    setEkKolonSet(new Set(kolonlar));
    setKolonKullanicilar([...kisiler]);
    setGizliTemel(new Set(gizli));
    const res = await listeKolonKaydet("urunler", {
      kolonlar: EK_KOLONLAR.filter((k) => kolonlar.has(k.key)).map(
        (k) => k.key,
      ),
      kullanicilar: kisiler,
      gizliTemel: TEMEL_KOLONLAR.filter((k) => gizli.has(k.key)).map(
        (k) => k.key,
      ),
    });
    if (!res.ok) {
      setEkKolonSet(oncekiK);
      setKolonKullanicilar(oncekiU);
      setGizliTemel(oncekiG);
      toast.error(res.error ?? "Kolon ayarı kaydedilemedi.");
    }
  }

  /** Ek kolonu aç/kapat. İlk kolon açılırken kullanıcı seçiliyse dokunma,
   *  hiç kullanıcı seçili değilse ayarı yapan da görsün diye kendini ekle. */
  async function gosterDegis(key: string, acik: boolean) {
    const k = new Set(ekKolonSet);
    if (acik) k.add(key);
    else k.delete(key);
    const kisiler =
      acik && kolonKullanicilar.length === 0 && mevcutKullaniciId
        ? [mevcutKullaniciId]
        : kolonKullanicilar;
    await ayarYaz(k, kisiler, gizliTemel);
  }

  /** Temel kolonu aç/kapat (kilitli olanlar hariç; herkes için geçerli). */
  async function temelDegis(key: string, acik: boolean) {
    const g = new Set(gizliTemel);
    if (acik) g.delete(key);
    else g.add(key);
    await ayarYaz(ekKolonSet, kolonKullanicilar, g);
  }

  /** Sheet genelindeki tek kullanıcı listesi değişimi. */
  async function kullanicilarDegis(ids: string[]) {
    await ayarYaz(ekKolonSet, ids, gizliTemel);
  }
  const [kategori, setKategori] = React.useState(initialKategori ?? "Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  // Sütun başlığı popover'larından gelen kolon-bazlı filtreler
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"fiyat" | "stok", { min: string; max: string }>
  >({ fiyat: { min: "", max: "" }, stok: { min: "", max: "" } });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({
    key: "id",
    dir: "asc",
  });
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const router = useRouter();

  // Filtre + sıralama
  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((u) => {
      const kat = kategori === "Tümü" || u.kategori === kategori;
      const dur = durum === "Tümü" || u.durum === durum;
      const kod = u.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = u.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const fiy = arada(u.fiyat, sayiFiltre.fiyat.min, sayiFiltre.fiyat.max);
      const stk = arada(u.stok, sayiFiltre.stok.min, sayiFiltre.stok.max);
      return kat && dur && kod && ad && fiy && stk;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, kategori, durum, metinFiltre, sayiFiltre, sort]);

  // Filtre değişince sayfayı başa al
  React.useEffect(() => {
    setSayfa(1);
  }, [kategori, durum, metinFiltre, sayiFiltre]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );

  const sayfaIds = sayfalik.map((u) => u.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  function secimDegis(id: string, deger: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      if (deger) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function tumunuSec(deger: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      sayfaIds.forEach((id) => (deger ? n.add(id) : n.delete(id)));
      return n;
    });
  }

  async function sil(ids: string[]) {
    const kaldirilan = liste.filter((u) => ids.includes(u.id));
    setListe((l) => l.filter((u) => !ids.includes(u.id)));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await modelSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} model silindi`);
    } else {
      setListe((l) => [...kaldirilan, ...l]);
      toast.error(res.error ?? "Silinemedi.");
    }
  }

  async function kopyala(u: Model) {
    const kopya: Model = {
      ...u,
      id: `URN-${Math.floor(1000 + Math.random() * 9000)}`,
      ad: `${u.ad} (kopya)`,
    };
    setListe((l) => [kopya, ...l]);
    await modelKaydet(kopya);
    toast.success("Model kopyalandı");
  }

  // Context menü yardımcıları
  function panoyaKopyala(text: string, etiket: string) {
    navigator.clipboard?.writeText(text);
    toast.success(`${etiket} kopyalandı`);
  }
  function durumDegistir(u: Model) {
    setListe((l) =>
      l.map((x) =>
        x.id === u.id
          ? { ...x, durum: x.durum === "Aktif" ? "Pasif" : "Aktif" }
          : x,
      ),
    );
    toast.success(
      `${u.ad} ${u.durum === "Aktif" ? "pasif" : "aktif"} yapıldı`,
    );
  }
  function kategoriyeTasi(u: Model, k: string) {
    setListe((l) =>
      l.map((x) =>
        x.id === u.id ? { ...x, kategori: k as Model["kategori"] } : x,
      ),
    );
    toast.success(`"${k}" kategorisine taşındı`);
  }
  const yakinda = (ad: string) => toast.success(`${ad} (yakında)`);

  const sortIkon = (key: SortKey) =>
    sort.key !== key ? (
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    ) : sort.dir === "asc" ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    );

  const kolonFiltreAktif = (k: SortKey) => {
    if (k === "kategori") return kategori !== "Tümü";
    if (k === "durum") return durum !== "Tümü";
    if (k === "id") return metinFiltre.id !== "";
    if (k === "ad") return metinFiltre.ad !== "";
    if (k === "fiyat")
      return sayiFiltre.fiyat.min !== "" || sayiFiltre.fiyat.max !== "";
    if (k === "stok")
      return sayiFiltre.stok.min !== "" || sayiFiltre.stok.max !== "";
    return false;
  };
  const kolonFiltreTemizle = (k: SortKey) => {
    if (k === "kategori") setKategori("Tümü");
    else if (k === "durum") setDurum("Tümü");
    else if (k === "id") setMetinFiltre((f) => ({ ...f, id: "" }));
    else if (k === "ad") setMetinFiltre((f) => ({ ...f, ad: "" }));
    else if (k === "fiyat")
      setSayiFiltre((f) => ({ ...f, fiyat: { min: "", max: "" } }));
    else if (k === "stok")
      setSayiFiltre((f) => ({ ...f, stok: { min: "", max: "" } }));
  };

  const ogeCls = (secili: boolean) =>
    cn(
      "flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
      secili && "bg-accent/60 font-medium",
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
    const sagda = className?.includes("text-right");
    return (
      <TableHead className={className}>
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1 hover:text-foreground",
                  sagda && "flex-row-reverse",
                )}
              >
                {children}
                {sortIkon(k)}
                {aktif && (
                  <span className="ml-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            }
          />
          <PopoverContent
            align={sagda ? "end" : "start"}
            className="w-56 gap-0 p-1.5 text-left"
          >
            {/* Sıralama */}
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

            {/* Filtre — sütun tipine göre */}
            <p className="px-1.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Filtre
            </p>

            {(k === "kategori" || k === "durum") && (
              <div className="grid max-h-56 gap-0.5 overflow-auto">
                {(k === "kategori"
                  ? ["Tümü", ...KATEGORILER]
                  : ["Tümü", "Aktif", "Pasif"]
                ).map((v) => {
                  const seciliDeger = k === "kategori" ? kategori : durum;
                  return (
                    <button
                      key={v}
                      type="button"
                      className={ogeCls(seciliDeger === v)}
                      onClick={() =>
                        k === "kategori" ? setKategori(v) : setDurum(v)
                      }
                    >
                      {v}
                      {seciliDeger === v && (
                        <Check className="ml-auto size-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

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

            {(k === "fiyat" || k === "stok") && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  placeholder="Min"
                  value={sayiFiltre[k].min}
                  onChange={(e) =>
                    setSayiFiltre((f) => ({
                      ...f,
                      [k]: { ...f[k], min: e.target.value },
                    }))
                  }
                  className="h-8"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={sayiFiltre[k].max}
                  onChange={(e) =>
                    setSayiFiltre((f) => ({
                      ...f,
                      [k]: { ...f[k], max: e.target.value },
                    }))
                  }
                  className="h-8"
                />
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
      {/* Toplu işlem çubuğu */}
      {secili.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{secili.size} model seçili</span>
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
        <ListHeader title="Modeller">
          {yonetici && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKolonSheet(true)}
            >
              <Columns3 className="size-4" /> Sütunlar
            </Button>
          )}
          <Button nativeButton={false} render={<Link href="/urunler/yeni" />}>
            Yeni Model
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
              {temelGorunur("kod") && <SortBaslik k="id">Kod</SortBaslik>}
              <SortBaslik k="ad">Model</SortBaslik>
              {temelGorunur("kategori") && (
                <SortBaslik k="kategori">Kategori</SortBaslik>
              )}
              {temelGorunur("fiyat") && (
                <SortBaslik k="fiyat" className="text-right">
                  Fiyat
                </SortBaslik>
              )}
              {temelGorunur("stok") && (
                <SortBaslik k="stok" className="text-right">
                  Stok
                </SortBaslik>
              )}
              {gorunurEk.map((k) => (
                <TableHead key={k.key} className={cn(k.sag && "text-right")}>
                  {k.label}
                </TableHead>
              ))}
              {temelGorunur("durum") && (
                <SortBaslik k="durum">Durum</SortBaslik>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((u) => (
              <ContextMenu key={u.id}>
                <ContextMenuTrigger
                  render={
                    <TableRow
                      data-state={secili.has(u.id) ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => router.push(`/urunler/${u.id}`)}
                    />
                  }
                >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={secili.has(u.id)}
                    onCheckedChange={(v) => secimDegis(u.id, v === true)}
                    aria-label={`${u.ad} seç`}
                  />
                </TableCell>
                {temelGorunur("kod") && (
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {u.id}
                  </TableCell>
                )}
                <TableCell className="font-medium">{u.ad}</TableCell>
                {temelGorunur("kategori") && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() =>
                        setKategori((k) =>
                          k === u.kategori ? "Tümü" : u.kategori,
                        )
                      }
                      title="Bu kategoriye göre filtrele"
                      className="-mx-1 cursor-pointer rounded-[5px] px-1 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {u.kategori}
                    </button>
                  </TableCell>
                )}
                {temelGorunur("fiyat") && (
                  <TableCell className="text-right tabular-nums">
                    {formatTL(u.fiyat)}
                  </TableCell>
                )}
                {temelGorunur("stok") && (
                  <TableCell className="text-right">
                    <StokHucre stok={u.stok} />
                  </TableCell>
                )}
                {gorunurEk.map((k) => (
                  <TableCell key={k.key} className={cn(k.sag && "text-right")}>
                    {k.hucre(u)}
                  </TableCell>
                ))}
                {temelGorunur("durum") && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() =>
                        setDurum((d) => (d === u.durum ? "Tümü" : u.durum))
                      }
                      title="Bu duruma göre filtrele"
                      className="cursor-pointer"
                    >
                      <Badge
                        variant={u.durum === "Aktif" ? "default" : "secondary"}
                      >
                        {u.durum}
                      </Badge>
                    </button>
                  </TableCell>
                )}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                  {/* Sık kullanılanlar üstte; gerisi alt menülerde (hiçbir işlev eksilmedi) */}
                  <ContextMenuItem
                    onClick={() => router.push(`/urunler/${u.id}`)}
                  >
                    <ExternalLink className="mr-2 size-4" /> Detayı Aç
                    <ContextMenuShortcut>⏎</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => router.push(`/urunler/${u.id}/duzenle`)}
                  >
                    <Pencil className="mr-2 size-4" /> Düzenle
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => kopyala(u)}>
                    <CopyPlus className="mr-2 size-4" /> Çoğalt
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => durumDegistir(u)}>
                    <Power className="mr-2 size-4" />
                    {u.durum === "Aktif" ? "Pasif Yap" : "Aktif Yap"}
                  </ContextMenuItem>

                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Hash className="mr-2 size-4" /> Kopyala
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem onClick={() => panoyaKopyala(u.id, "Kod")}>
                        <Hash className="mr-2 size-4" /> Kod
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => panoyaKopyala(u.ad, "Ad")}>
                        <Type className="mr-2 size-4" /> Ad
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() =>
                          panoyaKopyala(
                            `${window.location.origin}/urunler/${u.id}`,
                            "Bağlantı",
                          )
                        }
                      >
                        <Link2 className="mr-2 size-4" /> Bağlantı
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>

                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <ExternalLink className="mr-2 size-4" /> Git
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem
                        onClick={() => router.push("/stok-yonetimi?bolum=takip")}
                      >
                        <History className="mr-2 size-4" /> Stok Hareketleri
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => router.push("/uretim/recete")}
                      >
                        <Layers className="mr-2 size-4" /> Üretim Reçetesi
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => router.push("/siparisler")}>
                        <ShoppingCart className="mr-2 size-4" /> Siparişler
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>

                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Boxes className="mr-2 size-4" /> Diğer İşlemler
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>
                          <FolderInput className="mr-2 size-4" /> Kategoriye Taşı
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          {KATEGORILER.map((k) => (
                            <ContextMenuItem
                              key={k}
                              onClick={() => kategoriyeTasi(u, k)}
                            >
                              {k}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuItem onClick={() => yakinda("Stok düzelt")}>
                        <Boxes className="mr-2 size-4" /> Stok Düzelt
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => yakinda("Fiyat güncelle")}>
                        <Banknote className="mr-2 size-4" /> Fiyat Güncelle
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => yakinda("Üretime gönder")}>
                        <Hammer className="mr-2 size-4" /> Üretime Gönder
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => yakinda("Etiket ekle")}>
                        <Tags className="mr-2 size-4" /> Etiket Ekle
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => yakinda("Favorile")}>
                        <Star className="mr-2 size-4" /> Favorile
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => yakinda("Arşivle")}>
                        <Archive className="mr-2 size-4" /> Arşivle
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => yakinda("Dışa aktar")}>
                        <Download className="mr-2 size-4" /> Dışa Aktar
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>

                  <ContextMenuSeparator />
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => sil([u.id])}
                  >
                    <Trash2 className="mr-2 size-4" /> Sil
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={1 + gorunurTemelSayisi + gorunurEk.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sonuç bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sayfalama */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtreli.length} model
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

      {/* Sütun ayarları sheet'i */}
      <FormSheet
        open={kolonSheet}
        onOpenChange={setKolonSheet}
        title="Liste Sütunları"
        footer={
          <SheetFooter className="mt-1 flex-row justify-end gap-2 rounded-md border bg-card p-2">
            <SheetClose render={<Button variant="outline">Kapat</Button>} />
          </SheetFooter>
        }
      >
        <div className="grid gap-2.5">
          <p className="text-xs text-muted-foreground">
            Seçim anında uygulanır. Seçtiğiniz ek sütunlar aşağıdaki
            kullanıcıların listesinde görünür.
          </p>

          {/* Tek kullanıcı seçimi — tüm ek sütunlar için geçerli */}
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <span className="text-sm font-medium">Kullanıcılar</span>
            <KullaniciCoktanSecim
              kullanicilar={kullanicilar}
              secili={kolonKullanicilar}
              onDegis={kullanicilarDegis}
            />
          </div>

          {/* Tüm sütunlar tek listede: Model (kimlik) kilitli, gerisi aç/kapa */}
          <div className="overflow-hidden rounded-md border">
            {TEMEL_KOLONLAR.map((k) => (
              <label
                key={k.key}
                className={cn(
                  "flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0",
                  k.kilitli ? "cursor-default" : "cursor-pointer",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{k.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {k.aciklama}
                  </span>
                </span>
                <Switch
                  checked={k.kilitli || temelGorunur(k.key)}
                  disabled={k.kilitli}
                  onCheckedChange={(v) =>
                    !k.kilitli && temelDegis(k.key, v === true)
                  }
                  aria-label={`${k.label} kolonu`}
                  className="shrink-0 data-checked:bg-emerald-600"
                />
              </label>
            ))}
            {EK_KOLONLAR.map((k) => (
              <label
                key={k.key}
                className="flex cursor-pointer items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{k.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {k.aciklama}
                  </span>
                </span>
                <Switch
                  checked={ekKolonSet.has(k.key)}
                  onCheckedChange={(v) => gosterDegis(k.key, v === true)}
                  aria-label={`${k.label} kolonunu göster`}
                  className="shrink-0 data-checked:bg-emerald-600"
                />
              </label>
            ))}
          </div>
        </div>
      </FormSheet>
    </div>
  );
}

/** Combobox görünümlü çoklu kullanıcı seçimi (Popover + checkbox listesi). */
function KullaniciCoktanSecim({
  kullanicilar,
  secili,
  onDegis,
}: {
  kullanicilar: { id: string; ad: string }[];
  secili: string[];
  onDegis: (ids: string[]) => void;
}) {
  const seciliSet = new Set(secili);
  const etiket =
    secili.length === 0
      ? "Kullanıcı seç…"
      : secili.length === 1
        ? (kullanicilar.find((k) => k.id === secili[0])?.ad ?? "1 kullanıcı")
        : `${secili.length} kullanıcı`;

  function toggle(id: string, acik: boolean) {
    const yeni = new Set(seciliSet);
    if (acik) yeni.add(id);
    else yeni.delete(id);
    // Kullanıcı listesindeki sıraya göre kaydet.
    onDegis(kullanicilar.filter((k) => yeni.has(k.id)).map((k) => k.id));
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-8 w-52 cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
              secili.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">{etiket}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent align="start" className="w-52 p-1.5">
        <div className="grid max-h-56 gap-0.5 overflow-auto">
          {kullanicilar.map((k) => (
            <label
              key={k.id}
              className="flex cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Checkbox
                checked={seciliSet.has(k.id)}
                onCheckedChange={(v) => toggle(k.id, v === true)}
                aria-label={k.ad}
              />
              <span className="truncate">{k.ad}</span>
            </label>
          ))}
          {kullanicilar.length === 0 && (
            <p className="px-1.5 py-2 text-xs text-muted-foreground">
              Kullanıcı yok.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
