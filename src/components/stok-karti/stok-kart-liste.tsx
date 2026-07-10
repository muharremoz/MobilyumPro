"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { stokSil } from "@/lib/db/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL, type StokKarti, type StokGrubu } from "@/lib/data";

const GRUPLAR: StokGrubu[] = ["Hammadde", "Yarı Mamül", "Mamül", "Hizmet"];
const GRUP_RENK: Record<StokGrubu, string> = {
  Hammadde: "bg-blue-100 text-blue-800",
  "Yarı Mamül": "bg-violet-100 text-violet-800",
  Mamül: "bg-emerald-100 text-emerald-800",
  Hizmet: "bg-slate-100 text-slate-800",
};
const SAYFA_BOYUT = 10;

type SortKey =
  | "id"
  | "ad"
  | "grup"
  | "altGrup"
  | "stokBirimi"
  | "miktar"
  | "satisFiyat1"
  | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  {
    key: "id",
    label: "Kod",
    aciklama: "Stok kodu (kullanıcı kodu boşsa sistem kodu).",
    kilitli: true,
  },
  { key: "ad", label: "Ad", aciklama: "Stok kartı adı." },
  { key: "grup", label: "Grup", aciklama: "Hammadde/Yarı Mamül/Mamül/Hizmet." },
  { key: "altGrup", label: "Alt Grup", aciklama: "Bağlı olduğu alt grup." },
  { key: "stokBirimi", label: "Birim", aciklama: "Stok birimi (adet, m², …)." },
  {
    key: "miktar",
    label: "Miktar",
    aciklama: "Ledger'dan okunan mevcut miktar.",
  },
  {
    key: "satisFiyat1",
    label: "Satış Fiyatı",
    aciklama: "Satış fiyatı 1 (TL).",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: (KolonTanim & {
  hucre: (s: StokKarti) => React.ReactNode;
})[] = [
  {
    key: "marka",
    label: "Marka",
    aciklama: "Stok kartının markası.",
    hucre: (s) =>
      s.marka ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "barkod",
    label: "Barkod",
    aciklama: "Barkod numarası.",
    hucre: (s) =>
      s.barkod ? (
        <span className="font-mono text-xs">{s.barkod}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "maliyetFiyati",
    label: "Maliyet",
    aciklama: "Maliyet fiyatı (TL).",
    hucre: (s) => (
      <span className="tabular-nums">{formatTL(s.maliyetFiyati)}</span>
    ),
  },
];

const BOS_KULLANICILAR: { id: string; ad: string }[] = [];

export function StokKartListe({
  stoklar,
  kolonAyari,
  kullanicilar = BOS_KULLANICILAR,
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  stoklar: StokKarti[];
  /** Kolon ayarları (liste_ayar "stok-kartlari"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const router = useRouter();
  const [liste, setListe] = React.useState<StokKarti[]>(stoklar);
  React.useEffect(() => setListe(stoklar), [stoklar]);
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({
    id: "",
    ad: "",
    altGrup: "",
  });
  const [grupF, setGrupF] = React.useState("Tümü");
  const [durumF, setDurumF] = React.useState("Tümü");
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"miktar" | "satisFiyat1", { min: string; max: string }>
  >({ miktar: { min: "", max: "" }, satisFiyat1: { min: "", max: "" } });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "asc" },
  );
  const [sayfa, setSayfa] = React.useState(1);

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "stok-kartlari",
    yol: "/stok-karti",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });
  const gorunurEk = EK_KOLONLAR.filter((k) => kolon.ekGorunur(k.key));

  // Filtre değişince ilk sayfaya dön.
  React.useEffect(() => setSayfa(1), [metinFiltre, grupF, durumF, sayiFiltre]);

  const filtreli = React.useMemo(() => {
    const qId = metinFiltre.id.toLocaleLowerCase("tr");
    const qAd = metinFiltre.ad.toLocaleLowerCase("tr");
    const qAltGrup = metinFiltre.altGrup.toLocaleLowerCase("tr");
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter(
      (s) =>
        (!qId ||
          (s.kod ?? s.id).toLocaleLowerCase("tr").includes(qId)) &&
        (!qAd || s.ad.toLocaleLowerCase("tr").includes(qAd)) &&
        (!qAltGrup ||
          (s.altGrup?.toLocaleLowerCase("tr").includes(qAltGrup) ?? false)) &&
        (grupF === "Tümü" || s.grup === grupF) &&
        (durumF === "Tümü" || s.durum === durumF) &&
        arada(s.miktar, sayiFiltre.miktar.min, sayiFiltre.miktar.max) &&
        arada(
          s.satisFiyat1,
          sayiFiltre.satisFiyat1.min,
          sayiFiltre.satisFiyat1.max,
        ),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const deger = (x: StokKarti): string | number =>
        sort.key === "id" ? (x.kod ?? x.id) : (x[sort.key] ?? "");
      const va = deger(a);
      const vb = deger(b);
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
  }, [liste, metinFiltre, grupF, durumF, sayiFiltre, sort]);

  async function sil(s: StokKarti) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== s.id));
    const res = await stokSil(s.id);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Stok kartı silinemedi.");
      return;
    }
    toast.success("Stok kartı silindi");
  }

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Stok Kartları">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/stok-karti/yeni" />}
          >
            <Plus className="size-4" /> Yeni Stok Kartı
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
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
              {kolon.temelGorunur("ad") && (
                <SiralaFiltreBaslik
                  sira={sira("ad")}
                  onSirala={sirala("ad")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.ad,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, ad: v })),
                  }}
                >
                  Ad
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("grup") && (
                <SiralaFiltreBaslik
                  sira={sira("grup")}
                  onSirala={sirala("grup")}
                  filtre={{
                    tip: "liste",
                    secenekler: GRUPLAR,
                    deger: grupF,
                    onDeger: setGrupF,
                  }}
                >
                  Grup
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("altGrup") && (
                <SiralaFiltreBaslik
                  sira={sira("altGrup")}
                  onSirala={sirala("altGrup")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.altGrup,
                    onDeger: (v) =>
                      setMetinFiltre((f) => ({ ...f, altGrup: v })),
                  }}
                >
                  Alt Grup
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("stokBirimi") && (
                <SiralaFiltreBaslik
                  sira={sira("stokBirimi")}
                  onSirala={sirala("stokBirimi")}
                >
                  Birim
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("miktar") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("miktar")}
                  onSirala={sirala("miktar")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.miktar.min,
                    max: sayiFiltre.miktar.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, miktar: { min, max } })),
                  }}
                >
                  Miktar
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("satisFiyat1") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("satisFiyat1")}
                  onSirala={sirala("satisFiyat1")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.satisFiyat1.min,
                    max: sayiFiltre.satisFiyat1.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({
                        ...f,
                        satisFiyat1: { min, max },
                      })),
                  }}
                >
                  Satış Fiyatı
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Aktif", "Pasif"],
                    deger: durumF,
                    onDeger: setDurumF,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
              {gorunurEk.map((k) => (
                <TableHead key={k.key}>{k.label}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() => router.push(`/stok-karti/${s.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {s.kod ?? s.id}
                </TableCell>
                {kolon.temelGorunur("ad") && (
                  <TableCell className="font-medium">{s.ad}</TableCell>
                )}
                {kolon.temelGorunur("grup") && (
                  <TableCell>
                    <Badge variant="secondary" className={GRUP_RENK[s.grup]}>
                      {s.grup}
                    </Badge>
                  </TableCell>
                )}
                {kolon.temelGorunur("altGrup") && (
                  <TableCell className="text-muted-foreground">
                    {s.altGrup ?? "—"}
                  </TableCell>
                )}
                {kolon.temelGorunur("stokBirimi") && (
                  <TableCell className="text-muted-foreground">
                    {s.stokBirimi}
                  </TableCell>
                )}
                {kolon.temelGorunur("miktar") && (
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      s.miktar === 0 && "text-muted-foreground/60",
                    )}
                  >
                    {s.miktar.toLocaleString("tr-TR")}
                  </TableCell>
                )}
                {kolon.temelGorunur("satisFiyat1") && (
                  <TableCell className="text-right tabular-nums">
                    {formatTL(s.satisFiyat1)}
                  </TableCell>
                )}
                {kolon.temelGorunur("durum") && (
                  <TableCell>
                    <Badge
                      variant={s.durum === "Aktif" ? "default" : "secondary"}
                    >
                      {s.durum}
                    </Badge>
                  </TableCell>
                )}
                {gorunurEk.map((k) => (
                  <TableCell key={k.key}>{k.hucre(s)}</TableCell>
                ))}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="İşlemler"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onClick={() => router.push(`/stok-karti/${s.id}`)}
                      >
                        <Eye className="mr-2 size-4" /> Görüntüle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil(s)}
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
                  colSpan={1 + kolon.gorunurTemelSayisi + gorunurEk.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Stok kartı bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtreli.length} stok kartı</span>
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
