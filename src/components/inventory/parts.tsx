"use client";

import * as React from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Trash,
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
import { ListHeader } from "@/components/ui/list-header";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
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
import {
  type Parca,
  type Malzeme,
  type ParcaKategori,
  type ReceteSatiri,
} from "@/lib/data";
import { flattenParca } from "@/lib/bom";
import { parcaKaydet, parcaSil } from "@/lib/db/actions";

const KATEGORILER: ParcaKategori[] = [
  "Karyola",
  "Komidin",
  "Şifonyer",
  "Gardırop",
  "Ayna",
  "Sehpa",
  "Koltuk",
  "Diğer",
];
const SAYFA_BOYUT = 8;
type SortKey = "id" | "ad" | "kategori" | "recete" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Kod", aciklama: "Parça kodu (PRC-####)." },
  { key: "ad", label: "Parça", aciklama: "Parçanın adı.", kilitli: true },
  { key: "kategori", label: "Kategori", aciklama: "Parça kategorisi." },
  { key: "recete", label: "Reçete", aciklama: "Reçetedeki satır sayısı." },
  {
    key: "malzeme",
    label: "Malzeme",
    aciklama: "Alt-parçalar çözülmüş toplam malzeme çeşidi.",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function Parts({
  parcalar,
  malzemeler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  parcalar: Parca[];
  malzemeler: Malzeme[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const [liste, setListe] = React.useState<Parca[]>(parcalar);
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [kategori, setKategori] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [receteAralik, setReceteAralik] = React.useState({ min: "", max: "" });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "asc" },
  );
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Parca | null>(null);

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "parcalar",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  React.useEffect(
    () => setSayfa(1),
    [metinFiltre, kategori, durum, receteAralik],
  );

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((p) => {
      const kod = p.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = p.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const k = kategori === "Tümü" || p.kategori === kategori;
      const d = durum === "Tümü" || p.durum === durum;
      const r = arada(p.recete.length, receteAralik.min, receteAralik.max);
      return kod && ad && k && d && r;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "recete")
        return (a.recete.length - b.recete.length) * yon;
      const x = a[sort.key];
      const y = b[sort.key];
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, metinFiltre, kategori, durum, receteAralik, sort]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
  const sayfaIds = sayfalik.map((p) => p.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  // Reçete sayısı için yardımcı (flatten: alt-parça çözülmüş malzeme adedi).
  function malzemeAdet(p: Parca): number {
    const m = flattenParca(p.id, 1, liste);
    return m.size;
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
    const kaldirilan = liste.filter((p) => ids.includes(p.id));
    setListe((l) => l.filter((p) => !ids.includes(p.id)));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await parcaSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} parça silindi`);
    } else {
      setListe((l) => [...kaldirilan, ...l]);
      toast.error(res.error ?? "Silinemedi.");
    }
  }
  async function kopyala(p: Parca) {
    const k: Parca = {
      ...p,
      id: `PRC-${Math.floor(2000 + Math.random() * 8000)}`,
      ad: `${p.ad} (kopya)`,
      recete: [...p.recete],
    };
    setListe((l) => [k, ...l]);
    await parcaKaydet(k);
    toast.success("Parça kopyalandı");
  }
  async function kaydet(p: Parca) {
    setListe((l) => {
      const i = l.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        const n = [...l];
        n[i] = p;
        return n;
      }
      return [p, ...l];
    });
    await parcaKaydet(p);
  }

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

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
        <ListHeader title="Parçalar">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            onClick={() => {
              setDuzenlenen(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" /> Yeni Parça
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
              {kolon.temelGorunur("id") && (
                <SiralaFiltreBaslik
                  sira={sira("id")}
                  onSirala={sirala("id")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.id,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, id: v })),
                  }}
                >
                  Kod
                </SiralaFiltreBaslik>
              )}
              <SiralaFiltreBaslik
                sira={sira("ad")}
                onSirala={sirala("ad")}
                filtre={{
                  tip: "metin",
                  deger: metinFiltre.ad,
                  onDeger: (v) => setMetinFiltre((f) => ({ ...f, ad: v })),
                }}
              >
                Parça
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("kategori") && (
                <SiralaFiltreBaslik
                  sira={sira("kategori")}
                  onSirala={sirala("kategori")}
                  filtre={{
                    tip: "liste",
                    secenekler: KATEGORILER,
                    deger: kategori,
                    onDeger: setKategori,
                  }}
                >
                  Kategori
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("recete") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("recete")}
                  onSirala={sirala("recete")}
                  filtre={{
                    tip: "sayi",
                    min: receteAralik.min,
                    max: receteAralik.max,
                    onDegis: (min, max) => setReceteAralik({ min, max }),
                  }}
                >
                  Reçete
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("malzeme") && (
                <TableHead className="text-right">Malzeme</TableHead>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Aktif", "Pasif"],
                    deger: durum,
                    onDeger: setDurum,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((p) => (
              <TableRow
                key={p.id}
                data-state={secili.has(p.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => {
                  setDuzenlenen(p);
                  setSheetOpen(true);
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={secili.has(p.id)}
                    onCheckedChange={(v) => secimDegis(p.id, v === true)}
                    aria-label={`${p.ad} seç`}
                  />
                </TableCell>
                {kolon.temelGorunur("id") && (
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.id}
                  </TableCell>
                )}
                <TableCell className="font-medium">{p.ad}</TableCell>
                {kolon.temelGorunur("kategori") && (
                  <TableCell className="text-muted-foreground">
                    {p.kategori}
                  </TableCell>
                )}
                {kolon.temelGorunur("recete") && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.recete.length}
                  </TableCell>
                )}
                {kolon.temelGorunur("malzeme") && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {malzemeAdet(p)}
                  </TableCell>
                )}
                {kolon.temelGorunur("durum") && (
                  <TableCell>
                    <Badge
                      variant={p.durum === "Aktif" ? "default" : "secondary"}
                    >
                      {p.durum}
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
                          setDuzenlenen(p);
                          setSheetOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => kopyala(p)}>
                        <Plus className="mr-2 size-4" /> Kopyala
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil([p.id])}
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
                  Parça bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtreli.length} parça
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

      <PartSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        tumParcalar={liste}
        tumMalzemeler={malzemeler}
        onSave={kaydet}
      />

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}

function PartSheet({
  open,
  onOpenChange,
  item,
  tumParcalar,
  tumMalzemeler,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Parca | null;
  tumParcalar: Parca[];
  tumMalzemeler: Malzeme[];
  onSave: (p: Parca) => void;
}) {
  const [form, setForm] = React.useState({
    id: "",
    ad: "",
    kategori: "Karyola" as ParcaKategori,
    aciklama: "",
    durum: "Aktif" as "Aktif" | "Pasif",
  });
  const [recete, setRecete] = React.useState<ReceteSatiri[]>([]);
  const [tab, setTab] = React.useState<"bilgi" | "recete">("bilgi");
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        id: item.id,
        ad: item.ad,
        kategori: item.kategori,
        aciklama: item.aciklama ?? "",
        durum: item.durum,
      });
      setRecete(item.recete);
    } else {
      setForm({
        id: "",
        ad: "",
        kategori: "Karyola",
        aciklama: "",
        durum: "Aktif",
      });
      setRecete([]);
    }
    setTab("bilgi");
  }, [open, item]);

  function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Parça adı gerekli");
      return;
    }
    onSave({
      id: form.id.trim() || `PRC-${Math.floor(2000 + Math.random() * 8000)}`,
      ad: form.ad.trim(),
      kategori: form.kategori,
      aciklama: form.aciklama.trim() || undefined,
      durum: form.durum,
      recete,
    });
    toast.success(item ? "Parça güncellendi" : "Parça eklendi");
    onOpenChange(false);
  }

  // Reçeteye ekle
  function malzemeEkle(malzemeId: string) {
    setRecete((r) => [
      ...r,
      { bilesen: { tip: "malzeme", ref: malzemeId }, miktar: 1 },
    ]);
  }
  function parcaEkle(parcaId: string) {
    setRecete((r) => [
      ...r,
      { bilesen: { tip: "parca", ref: parcaId }, miktar: 1 },
    ]);
  }
  function satirSil(i: number) {
    setRecete((r) => r.filter((_, j) => j !== i));
  }
  function satirMiktar(i: number, v: string) {
    const n = Number(v);
    setRecete((r) =>
      r.map((s, j) =>
        j === i ? { ...s, miktar: isNaN(n) ? 0 : n } : s,
      ),
    );
  }

  const baskaParcalar = tumParcalar.filter((p) => p.id !== item?.id);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Parçayı Düzenle" : "Yeni Parça"}
      icon={BlocksIcon}
      onSave={kaydet}
      contentClassName="p-0"
    >
      <div className="flex h-full flex-col">
        {/* Sekme bar */}
        <div className="flex gap-1 border-b px-3 pt-2">
          <TabBtn aktif={tab === "bilgi"} onClick={() => setTab("bilgi")}>
            Bilgi
          </TabBtn>
          <TabBtn aktif={tab === "recete"} onClick={() => setTab("recete")}>
            Reçete ({recete.length})
          </TabBtn>
        </div>

        <div className="flex-1 overflow-auto p-3.5">
          {tab === "bilgi" && (
            <div className="grid gap-2.5">
              <IconInput
                label="Parça Adı"
                icon={BlocksIcon}
                placeholder="Örn. Komidin 2 Çekmeceli"
                value={form.ad}
                onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
              />
              <IconInput
                label="Kod"
                icon={ScanTextIcon}
                placeholder="PRC-0000"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              />
              <AnimatedField label="Kategori" icon={FolderOpenIcon}>
                <SearchSelect
                  items={KATEGORILER}
                  value={form.kategori}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      kategori: (v as ParcaKategori) ?? "Diğer",
                    }))
                  }
                  placeholder="Kategori"
                />
              </AnimatedField>
              <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
                <textarea
                  rows={3}
                  placeholder="Kısa açıklama..."
                  value={form.aciklama}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, aciklama: e.target.value }))
                  }
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                />
              </AnimatedField>
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
                  <span className="text-xs text-muted-foreground">
                    {form.durum}
                  </span>
                  <Switch
                    checked={form.durum === "Aktif"}
                    className="pointer-events-none data-checked:bg-emerald-600"
                  />
                </span>
              </div>
            </div>
          )}

          {tab === "recete" && (
            <RecipeEditor
              recete={recete}
              parcalar={baskaParcalar}
              malzemeler={tumMalzemeler}
              onMalzemeEkle={malzemeEkle}
              onParcaEkle={parcaEkle}
              onSatirSil={satirSil}
              onMiktar={satirMiktar}
            />
          )}
        </div>
      </div>
    </FormSheet>
  );
}

function TabBtn({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
        aktif
          ? "border-foreground font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function RecipeEditor({
  recete,
  parcalar,
  malzemeler,
  onMalzemeEkle,
  onParcaEkle,
  onSatirSil,
  onMiktar,
}: {
  recete: ReceteSatiri[];
  parcalar: Parca[];
  malzemeler: Malzeme[];
  onMalzemeEkle: (id: string) => void;
  onParcaEkle: (id: string) => void;
  onSatirSil: (i: number) => void;
  onMiktar: (i: number, v: string) => void;
}) {
  // Malzeme/parça ekleme için seçim kutuları (aranabilir).
  const [malzemeSec, setMalzemeSec] = React.useState<string | null>(null);
  const [parcaSec, setParcaSec] = React.useState<string | null>(null);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [],
  );
  const parcaMap = React.useMemo(
    () => new Map(parcalar.map((p) => [p.id, p])),
    [parcalar],
  );

  function malzemeEtiket(id: string) {
    const m = malzemeMap.get(id);
    return m ? `${m.ad} · ${m.birim}` : id;
  }
  function parcaEtiket(id: string) {
    const p = parcaMap.get(id);
    return p ? `${p.ad}` : id;
  }

  function handleMalzeme(v: string | null) {
    if (!v) return;
    // SearchSelect tam ad'ı geri verir — eşleşen malzemeyi bul.
    const m = malzemeler.find((x) => malzemeEtiket(x.id) === v);
    if (m) {
      onMalzemeEkle(m.id);
      setMalzemeSec(null);
    }
  }
  function handleParca(v: string | null) {
    if (!v) return;
    const p = parcalar.find((x) => parcaEtiket(x.id) === v);
    if (p) {
      onParcaEkle(p.id);
      setParcaSec(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Bileşen ekleme */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Malzeme ekle
          </label>
          <SearchSelect
            items={malzemeler.map((m) => malzemeEtiket(m.id))}
            value={malzemeSec}
            onValueChange={handleMalzeme}
            placeholder="Malzeme seç"
            searchPlaceholder="Malzeme ara..."
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Parça ekle (alt-parça)
          </label>
          <SearchSelect
            items={parcalar.map((p) => parcaEtiket(p.id))}
            value={parcaSec}
            onValueChange={handleParca}
            placeholder="Parça seç"
            searchPlaceholder="Parça ara..."
          />
        </div>
      </div>

      {/* Reçete tablosu */}
      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tip</TableHead>
              <TableHead>Bileşen</TableHead>
              <TableHead className="w-28 text-right">Miktar</TableHead>
              <TableHead className="w-16">Birim</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {recete.map((s, i) => {
              const tipM = s.bilesen.tip === "malzeme";
              const m = tipM ? malzemeMap.get(s.bilesen.ref) : undefined;
              const p = !tipM ? parcaMap.get(s.bilesen.ref) : undefined;
              return (
                <TableRow key={`${s.bilesen.tip}-${s.bilesen.ref}-${i}`}>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        tipM
                          ? "bg-blue-100 text-blue-800"
                          : "bg-violet-100 text-violet-800"
                      }
                    >
                      {tipM ? "Malzeme" : "Parça"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {tipM ? m?.ad ?? "?" : p?.ad ?? "?"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={s.miktar}
                      onChange={(e) => onMiktar(i, e.target.value)}
                      className="h-8 w-20 text-right tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tipM ? m?.birim ?? "" : "adet"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onSatirSil(i)}
                      aria-label="Sil"
                    >
                      <Trash className="size-3.5 text-rose-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {recete.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-20 text-center text-sm text-muted-foreground"
                >
                  Henüz bileşen yok. Üstten Malzeme veya Parça ekleyin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
