"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
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
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchSelect } from "@/components/ui/search-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuGroup,
  ContextMenuLabel,
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
import { formatTL, type Urun } from "@/lib/data";
import { urunKaydet, urunSil } from "@/lib/db/actions";

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

export function ProductsTable({
  urunler,
  initialKategori,
}: {
  urunler: Urun[];
  initialKategori?: string;
}) {
  const [liste, setListe] = React.useState<Urun[]>(urunler);
  const [arama, setArama] = React.useState("");
  const [kategori, setKategori] = React.useState(initialKategori ?? "Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({
    key: "id",
    dir: "asc",
  });
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const router = useRouter();

  // Filtre + sıralama
  const filtreli = React.useMemo(() => {
    const q = arama.toLowerCase();
    const arr = liste.filter((u) => {
      const ara = u.ad.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
      const kat = kategori === "Tümü" || u.kategori === kategori;
      const dur = durum === "Tümü" || u.durum === durum;
      return ara && kat && dur;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, arama, kategori, durum, sort]);

  // Filtre değişince sayfayı başa al
  React.useEffect(() => {
    setSayfa(1);
  }, [arama, kategori, durum]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );

  const sayfaIds = sayfalik.map((u) => u.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  function sortla(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

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
    const res = await urunSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} ürün silindi`);
    } else {
      setListe((l) => [...kaldirilan, ...l]);
      toast.error(res.error ?? "Silinemedi.");
    }
  }

  async function kopyala(u: Urun) {
    const kopya: Urun = {
      ...u,
      id: `URN-${Math.floor(1000 + Math.random() * 9000)}`,
      ad: `${u.ad} (kopya)`,
    };
    setListe((l) => [kopya, ...l]);
    await urunKaydet(kopya);
    toast.success("Ürün kopyalandı");
  }

  // Context menü yardımcıları
  function panoyaKopyala(text: string, etiket: string) {
    navigator.clipboard?.writeText(text);
    toast.success(`${etiket} kopyalandı`);
  }
  function durumDegistir(u: Urun) {
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
  function kategoriyeTasi(u: Urun, k: string) {
    setListe((l) =>
      l.map((x) =>
        x.id === u.id ? { ...x, kategori: k as Urun["kategori"] } : x,
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
        className="inline-flex items-center gap-1 hover:text-foreground"
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
            placeholder="Ürün veya kod ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="w-44">
          <SearchSelect
            items={["Tümü", ...KATEGORILER]}
            value={kategori}
            onValueChange={(v) => setKategori(v ?? "Tümü")}
            placeholder="Kategori"
            searchPlaceholder="Kategori ara..."
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
          render={<Link href="/urunler/yeni" />}
        >
          <Plus className="size-4" /> Yeni Ürün
        </Button>
      </div>

      {/* Toplu işlem çubuğu */}
      {secili.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{secili.size} ürün seçili</span>
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
              <SortBaslik k="id">Kod</SortBaslik>
              <SortBaslik k="ad">Ürün</SortBaslik>
              <SortBaslik k="kategori">Kategori</SortBaslik>
              <SortBaslik k="fiyat" className="text-right">
                Fiyat
              </SortBaslik>
              <SortBaslik k="stok" className="text-right">
                Stok
              </SortBaslik>
              <SortBaslik k="durum">Durum</SortBaslik>
              <TableHead className="w-10" />
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
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {u.id}
                </TableCell>
                <TableCell className="font-medium">{u.ad}</TableCell>
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
                <TableCell className="text-right tabular-nums">
                  {formatTL(u.fiyat)}
                </TableCell>
                <TableCell className="text-right">
                  <StokHucre stok={u.stok} />
                </TableCell>
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label="İşlemler">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => router.push(`/urunler/${u.id}/duzenle`)}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => kopyala(u)}>
                        <Copy className="mr-2 size-4" /> Kopyala
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil([u.id])}
                      >
                        <Trash2 className="mr-2 size-4" /> Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                  {/* Görüntüle / Navigasyon */}
                  <ContextMenuGroup>
                    <ContextMenuLabel>Görüntüle</ContextMenuLabel>
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
                    <ContextMenuItem
                      onClick={() =>
                        router.push("/stok-yonetimi?bolum=takip")
                      }
                    >
                      <History className="mr-2 size-4" /> Stok Hareketleri
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => router.push("/uretim/recete")}
                    >
                      <Layers className="mr-2 size-4" /> Üretim Reçetesi
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => router.push("/siparisler")}>
                      <ShoppingCart className="mr-2 size-4" /> Siparişlerde Göster
                    </ContextMenuItem>
                  </ContextMenuGroup>

                  <ContextMenuSeparator />

                  {/* Hızlı işlemler */}
                  <ContextMenuGroup>
                    <ContextMenuLabel>Hızlı İşlem</ContextMenuLabel>
                    <ContextMenuItem onClick={() => durumDegistir(u)}>
                      <Power className="mr-2 size-4" />
                      {u.durum === "Aktif" ? "Pasif Yap" : "Aktif Yap"}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => yakinda("Stok düzelt")}>
                      <Boxes className="mr-2 size-4" /> Stok Düzelt
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => yakinda("Fiyat güncelle")}>
                      <Banknote className="mr-2 size-4" /> Fiyat Güncelle
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => yakinda("Üretime gönder")}>
                      <Hammer className="mr-2 size-4" /> Üretime Gönder
                    </ContextMenuItem>
                  </ContextMenuGroup>

                  <ContextMenuSeparator />

                  {/* Kopyala / Aktar */}
                  <ContextMenuGroup>
                    <ContextMenuLabel>Kopyala / Aktar</ContextMenuLabel>
                    <ContextMenuItem
                      onClick={() => panoyaKopyala(u.id, "Kod")}
                    >
                      <Hash className="mr-2 size-4" /> Kodu Kopyala
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => panoyaKopyala(u.ad, "Ad")}
                    >
                      <Type className="mr-2 size-4" /> Adı Kopyala
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        panoyaKopyala(
                          `${window.location.origin}/urunler/${u.id}`,
                          "Bağlantı",
                        )
                      }
                    >
                      <Link2 className="mr-2 size-4" /> Bağlantıyı Kopyala
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => kopyala(u)}>
                      <CopyPlus className="mr-2 size-4" /> Çoğalt
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => yakinda("Dışa aktar")}>
                      <Download className="mr-2 size-4" /> Dışa Aktar
                    </ContextMenuItem>
                  </ContextMenuGroup>

                  <ContextMenuSeparator />

                  {/* Düzenleme yardımcıları */}
                  <ContextMenuGroup>
                    <ContextMenuLabel>Düzenle</ContextMenuLabel>
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
                    <ContextMenuItem onClick={() => yakinda("Etiket ekle")}>
                      <Tags className="mr-2 size-4" /> Etiket Ekle
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => yakinda("Favorile")}>
                      <Star className="mr-2 size-4" /> Favorile
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => yakinda("Arşivle")}>
                      <Archive className="mr-2 size-4" /> Arşivle
                    </ContextMenuItem>
                  </ContextMenuGroup>

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
                  colSpan={8}
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
          {filtreli.length} ürün
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
