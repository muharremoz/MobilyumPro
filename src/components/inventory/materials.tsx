"use client";

import * as React from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatTL, type Malzeme, type StokGrup } from "@/lib/data";
import { GrupSecici } from "@/components/ui/grup-secici";
import { malzemeKaydet, malzemeSil } from "@/lib/db/actions";

const BIRIMLER = ["adet", "m", "m²", "m³", "kg", "lt", "takım"];
const SAYFA_BOYUT = 8;
type SortKey = "id" | "ad" | "grup" | "birim" | "stok" | "birimFiyat" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "kod", label: "Kod", aciklama: "Malzeme kodu (MLZ-####)." },
  { key: "ad", label: "Malzeme", aciklama: "Malzemenin adı.", kilitli: true },
  {
    key: "grup",
    label: "Grup",
    aciklama: "Stok grubu (Tanımlamalar → Gruplar).",
  },
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
  birimler,
  gruplar = [],
  tedarikciler = [],
}: {
  malzemeler: Malzeme[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
  /** Birim seçenekleri (Tanımlamalar → Birimler); boşsa varsayılan liste. */
  birimler?: string[];
  /** Stok grup ağacı (Tanımlamalar → Gruplar). */
  gruplar?: StokGrup[];
  /** Tedarikçi seçenekleri (cari kartlardan: Tedarikçi / Her İkisi). */
  tedarikciler?: string[];
}) {
  const birimSecenekleri =
    birimler && birimler.length > 0 ? birimler : BIRIMLER;
  const [liste, setListe] = React.useState<Malzeme[]>(malzemeler);
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [grupF, setGrupF] = React.useState("Tümü");
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

  // Grup filtresi seçenekleri — ağaçtaki tüm grup adları.
  const grupSecenekleri = React.useMemo(
    () => gruplar.map((g) => g.ad).sort((a, b) => a.localeCompare(b, "tr")),
    [gruplar],
  );

  React.useEffect(
    () => setSayfa(1),
    [metinFiltre, grupF, birimF, durum, sayiFiltre],
  );

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((m) => {
      const kod = m.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = m.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const g = grupF === "Tümü" || m.grup === grupF;
      const b = birimF === "Tümü" || m.birim === birimF;
      const d = durum === "Tümü" || m.durum === durum;
      const stk = arada(m.stok, sayiFiltre.stok.min, sayiFiltre.stok.max);
      const fiy = arada(
        m.birimFiyat,
        sayiFiltre.birimFiyat.min,
        sayiFiltre.birimFiyat.max,
      );
      return kod && ad && g && b && d && stk && fiy;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key] ?? "";
      const y = b[sort.key] ?? "";
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, metinFiltre, grupF, birimF, durum, sayiFiltre, sort]);

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
              {kolon.temelGorunur("kod") && (
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
                Malzeme
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("grup") && (
                <SiralaFiltreBaslik
                  sira={sira("grup")}
                  onSirala={sirala("grup")}
                  filtre={{
                    tip: "liste",
                    secenekler: grupSecenekleri,
                    deger: grupF,
                    onDeger: setGrupF,
                  }}
                >
                  Grup
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("birim") && (
                <SiralaFiltreBaslik
                  sira={sira("birim")}
                  onSirala={sirala("birim")}
                  filtre={{
                    tip: "liste",
                    secenekler: birimSecenekleri,
                    deger: birimF,
                    onDeger: setBirimF,
                  }}
                >
                  Birim
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("stok") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("stok")}
                  onSirala={sirala("stok")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.stok.min,
                    max: sayiFiltre.stok.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, stok: { min, max } })),
                  }}
                >
                  Stok
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("birimFiyat") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("birimFiyat")}
                  onSirala={sirala("birimFiyat")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.birimFiyat.min,
                    max: sayiFiltre.birimFiyat.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({
                        ...f,
                        birimFiyat: { min, max },
                      })),
                  }}
                >
                  Birim Fiyat
                </SiralaFiltreBaslik>
              )}
              {gorunurEk.map((k) => (
                <TableHead key={k.key}>{k.label}</TableHead>
              ))}
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
                {kolon.temelGorunur("grup") && (
                  <TableCell className="text-muted-foreground">
                    {m.grup ?? "—"}
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
        gruplar={gruplar}
        birimler={birimSecenekleri}
        tedarikciler={tedarikciler}
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
  gruplar = [],
  birimler = BIRIMLER,
  tedarikciler = [],
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Malzeme | null;
  gruplar?: StokGrup[];
  birimler?: string[];
  tedarikciler?: string[];
  onSave: (m: Malzeme) => void;
}) {
  const [form, setForm] = React.useState({
    id: "",
    ad: "",
    grup: "",
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
        grup: item.grup ?? "",
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
        grup: "",
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
      grup: form.grup || undefined,
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
          <AnimatedField label="Grup" icon={FolderOpenIcon}>
            <GrupSecici
              gruplar={gruplar}
              value={form.grup || null}
              onValueChange={(v) => setForm((f) => ({ ...f, grup: v ?? "" }))}
              placeholder="Grup seç"
            />
          </AnimatedField>
          <AnimatedField label="Birim" icon={BoxesIcon}>
            <SearchSelect
              items={birimler}
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
        <AnimatedField label="Tedarikçi" icon={UsersRoundIcon}>
          <SearchSelect
            items={tedarikciler}
            value={form.tedarikci || null}
            onValueChange={(v) => setForm((f) => ({ ...f, tedarikci: v ?? "" }))}
            placeholder="Cari kartlardan seç"
            emptyText="Tedarikçi tipli cari yok — önce Cari Hesaplar'dan ekleyin"
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
