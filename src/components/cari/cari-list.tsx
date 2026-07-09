"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ListHeader } from "@/components/ui/list-header";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
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
import { formatTL, type Cari, type CariTip } from "@/lib/data";
import { cariSil } from "@/lib/db/actions";

const TIPLER: CariTip[] = ["Müşteri", "Tedarikçi", "Her İkisi", "Banka"];
const TIP_RENK: Record<CariTip, string> = {
  Müşteri: "bg-blue-100 text-blue-800",
  Tedarikçi: "bg-amber-100 text-amber-800",
  "Her İkisi": "bg-violet-100 text-violet-800",
  Banka: "bg-emerald-100 text-emerald-800",
};
const SAYFA_BOYUT = 8;
type SortKey = "id" | "ad" | "tip" | "sehir" | "bakiye" | "durum" | "telefon";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Kod", aciklama: "Cari hesap kodu." },
  {
    key: "ad",
    label: "Ad / Unvan",
    aciklama: "Cari adı veya unvanı.",
    kilitli: true,
  },
  { key: "tip", label: "Tip", aciklama: "Müşteri/Tedarikçi tipi." },
  { key: "sehir", label: "Şehir", aciklama: "Bulunduğu şehir." },
  { key: "bakiye", label: "Bakiye", aciklama: "Güncel bakiye (A/B)." },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [
  { key: "telefon", label: "Telefon", aciklama: "Cari telefon numarası." },
];

export function CariList({
  cariler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  cariler: Cari[];
  /** Kolon ayarları (liste_ayar "cariler"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const router = useRouter();
  const [liste, setListe] = React.useState<Cari[]>(cariler);
  React.useEffect(() => setListe(cariler), [cariler]);
  // Kolon filtreleri (başlık popover'larından)
  const [kodFiltre, setKodFiltre] = React.useState("");
  const [adFiltre, setAdFiltre] = React.useState("");
  const [sehirFiltre, setSehirFiltre] = React.useState("");
  const [telefonFiltre, setTelefonFiltre] = React.useState("");
  const [bakiyeAralik, setBakiyeAralik] = React.useState({ min: "", max: "" });
  const [tip, setTip] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "asc" },
  );
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "cariler",
    yol: "/cari",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  // Filtre değişince ilk sayfaya dön.
  React.useEffect(
    () => setSayfa(1),
    [kodFiltre, adFiltre, sehirFiltre, telefonFiltre, bakiyeAralik, tip, durum],
  );

  const filtreli = React.useMemo(() => {
    const qKod = kodFiltre.toLowerCase();
    const qAd = adFiltre.toLowerCase();
    const qSehir = sehirFiltre.toLowerCase();
    const qTel = telefonFiltre.toLowerCase();
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((c) => {
      const kod = c.id.toLowerCase().includes(qKod);
      // Ad kolonunda e-posta da gösterildiği için filtre ikisine de bakar.
      const ad =
        c.ad.toLowerCase().includes(qAd) ||
        (c.email?.toLowerCase().includes(qAd) ?? false);
      const sehir =
        qSehir === "" || (c.sehir?.toLowerCase().includes(qSehir) ?? false);
      const tel =
        qTel === "" || (c.telefon?.toLowerCase().includes(qTel) ?? false);
      const bakiye = arada(c.bakiye, bakiyeAralik.min, bakiyeAralik.max);
      const t = tip === "Tümü" || c.tip === tip;
      const d = durum === "Tümü" || c.durum === durum;
      return kod && ad && sehir && tel && bakiye && t && d;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x ?? "").localeCompare(String(y ?? ""), "tr") * yon;
    });
  }, [
    liste,
    kodFiltre,
    adFiltre,
    sehirFiltre,
    telefonFiltre,
    bakiyeAralik,
    tip,
    durum,
    sort,
  ]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
  const sayfaIds = sayfalik.map((c) => c.id);
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

      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Cari Hesaplar">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button nativeButton={false} render={<Link href="/cari/yeni" />}>
            <Plus className="size-4" /> Yeni Cari
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
                    deger: kodFiltre,
                    onDeger: setKodFiltre,
                  }}
                >
                  Kod
                </SiralaFiltreBaslik>
              )}
              <SiralaFiltreBaslik
                sira={sira("ad")}
                onSirala={sirala("ad")}
                filtre={{ tip: "metin", deger: adFiltre, onDeger: setAdFiltre }}
              >
                Ad / Unvan
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("tip") && (
                <SiralaFiltreBaslik
                  sira={sira("tip")}
                  onSirala={sirala("tip")}
                  filtre={{
                    tip: "liste",
                    secenekler: TIPLER,
                    deger: tip,
                    onDeger: setTip,
                  }}
                >
                  Tip
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("sehir") && (
                <SiralaFiltreBaslik
                  sira={sira("sehir")}
                  onSirala={sirala("sehir")}
                  filtre={{
                    tip: "metin",
                    deger: sehirFiltre,
                    onDeger: setSehirFiltre,
                  }}
                >
                  Şehir
                </SiralaFiltreBaslik>
              )}
              {kolon.ekGorunur("telefon") && (
                <SiralaFiltreBaslik
                  sira={sira("telefon")}
                  onSirala={sirala("telefon")}
                  filtre={{
                    tip: "metin",
                    deger: telefonFiltre,
                    onDeger: setTelefonFiltre,
                  }}
                >
                  Telefon
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("bakiye") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("bakiye")}
                  onSirala={sirala("bakiye")}
                  filtre={{
                    tip: "sayi",
                    min: bakiyeAralik.min,
                    max: bakiyeAralik.max,
                    onDegis: (min, max) => setBakiyeAralik({ min, max }),
                  }}
                >
                  Bakiye
                </SiralaFiltreBaslik>
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
                {kolon.temelGorunur("id") && (
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.id}
                  </TableCell>
                )}
                <TableCell>
                  <div className="font-medium">{c.ad}</div>
                  {c.email && (
                    <div className="text-[11px] text-muted-foreground">
                      {c.email}
                    </div>
                  )}
                </TableCell>
                {kolon.temelGorunur("tip") && (
                  <TableCell>
                    <Badge variant="secondary" className={TIP_RENK[c.tip]}>
                      {c.tip}
                    </Badge>
                  </TableCell>
                )}
                {kolon.temelGorunur("sehir") && (
                  <TableCell className="text-muted-foreground">
                    {c.sehir ?? "—"}
                  </TableCell>
                )}
                {kolon.ekGorunur("telefon") && (
                  <TableCell className="text-muted-foreground tabular-nums">
                    {c.telefon ?? "—"}
                  </TableCell>
                )}
                {kolon.temelGorunur("bakiye") && (
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
                )}
                {kolon.temelGorunur("durum") && (
                  <TableCell>
                    <Badge
                      variant={c.durum === "Aktif" ? "default" : "secondary"}
                    >
                      {c.durum}
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
                        onClick={() => router.push(`/cari/${c.id}`)}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
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
                  colSpan={
                    2 +
                    kolon.gorunurTemelSayisi +
                    (kolon.ekGorunur("telefon") ? 1 : 0)
                  }
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

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}
