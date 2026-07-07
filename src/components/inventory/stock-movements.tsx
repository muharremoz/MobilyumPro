"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowUpFromLine, Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTarih,
  type StokHareket,
  type StokHareketTuru,
  type Model,
  type Malzeme,
} from "@/lib/data";

const TUR_RENK: Record<StokHareketTuru, string> = {
  Giriş: "bg-emerald-100 text-emerald-800",
  Çıkış: "bg-rose-100 text-rose-800",
  Transfer: "bg-blue-100 text-blue-800",
};

const TUR_ICON: Record<StokHareketTuru, React.ReactNode> = {
  Giriş: <ArrowDownToLine className="size-3.5" />,
  Çıkış: <ArrowUpFromLine className="size-3.5" />,
  Transfer: <Repeat className="size-3.5" />,
};

type SortKey = "id" | "tarih" | "tur" | "oge" | "miktar" | "birim" | "depo" | "aciklama";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Belge", aciklama: "Hareket belge numarası.", kilitli: true },
  { key: "tarih", label: "Tarih", aciklama: "Hareketin tarihi." },
  { key: "tur", label: "Tür", aciklama: "Giriş / Çıkış / Transfer." },
  { key: "oge", label: "Öğe", aciklama: "Hareket edilen model veya malzeme." },
  { key: "miktar", label: "Miktar", aciklama: "Hareket miktarı." },
  { key: "birim", label: "Birim", aciklama: "Miktarın birimi." },
  { key: "depo", label: "Depo", aciklama: "İlgili depo." },
  { key: "aciklama", label: "Açıklama", aciklama: "Hareket açıklaması." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function StockMovements({
  hareketler,
  urunler,
  malzemeler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  hareketler: StokHareket[];
  urunler: Model[];
  malzemeler: Malzeme[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({
    id: "",
    oge: "",
    aciklama: "",
  });
  const [tur, setTur] = React.useState("Tümü");
  const [birimF, setBirimF] = React.useState("Tümü");
  const [depoF, setDepoF] = React.useState("Tümü");
  const [miktarAralik, setMiktarAralik] = React.useState({ min: "", max: "" });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "tarih", dir: "desc" },
  );

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "stok-hareketleri",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const refAd = React.useCallback(
    (ref: { tip: "model" | "malzeme"; id: string }) => {
      if (ref.tip === "model")
        return urunler.find((u) => u.id === ref.id)?.ad ?? ref.id;
      return malzemeler.find((m) => m.id === ref.id)?.ad ?? ref.id;
    },
    [urunler, malzemeler],
  );

  const birimler = React.useMemo(
    () => [...new Set(hareketler.map((h) => h.birim))],
    [hareketler],
  );
  const depolar = React.useMemo(
    () => [...new Set(hareketler.map((h) => h.depo))],
    [hareketler],
  );

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = hareketler.filter((h) => {
      const belge = h.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const oge = refAd(h.ref)
        .toLowerCase()
        .includes(metinFiltre.oge.toLowerCase());
      const acik = h.aciklama
        .toLowerCase()
        .includes(metinFiltre.aciklama.toLowerCase());
      const t = tur === "Tümü" || h.tur === tur;
      const b = birimF === "Tümü" || h.birim === birimF;
      const d = depoF === "Tümü" || h.depo === depoF;
      const m = arada(h.miktar, miktarAralik.min, miktarAralik.max);
      return belge && oge && acik && t && b && d && m;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "miktar") return (a.miktar - b.miktar) * yon;
      const x = sort.key === "oge" ? refAd(a.ref) : a[sort.key];
      const y = sort.key === "oge" ? refAd(b.ref) : b[sort.key];
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [hareketler, metinFiltre, tur, birimF, depoF, miktarAralik, sort, refAd]);

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      {/* Tablo — proje standardı liste kartı */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Stok Hareketleri">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
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
                Belge
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("tarih") && (
                <SiralaFiltreBaslik
                  sira={sira("tarih")}
                  onSirala={sirala("tarih")}
                >
                  Tarih
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("tur") && (
                <SiralaFiltreBaslik
                  sira={sira("tur")}
                  onSirala={sirala("tur")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Giriş", "Çıkış", "Transfer"],
                    deger: tur,
                    onDeger: setTur,
                  }}
                >
                  Tür
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("oge") && (
                <SiralaFiltreBaslik
                  sira={sira("oge")}
                  onSirala={sirala("oge")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.oge,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, oge: v })),
                  }}
                >
                  Öğe
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("miktar") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("miktar")}
                  onSirala={sirala("miktar")}
                  filtre={{
                    tip: "sayi",
                    min: miktarAralik.min,
                    max: miktarAralik.max,
                    onDegis: (min, max) => setMiktarAralik({ min, max }),
                  }}
                >
                  Miktar
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("birim") && (
                <SiralaFiltreBaslik
                  sira={sira("birim")}
                  onSirala={sirala("birim")}
                  filtre={{
                    tip: "liste",
                    secenekler: birimler,
                    deger: birimF,
                    onDeger: setBirimF,
                  }}
                >
                  Birim
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("depo") && (
                <SiralaFiltreBaslik
                  sira={sira("depo")}
                  onSirala={sirala("depo")}
                  filtre={{
                    tip: "liste",
                    secenekler: depolar,
                    deger: depoF,
                    onDeger: setDepoF,
                  }}
                >
                  Depo
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("aciklama") && (
                <SiralaFiltreBaslik
                  sira={sira("aciklama")}
                  onSirala={sirala("aciklama")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.aciklama,
                    onDeger: (v) =>
                      setMetinFiltre((f) => ({ ...f, aciklama: v })),
                  }}
                >
                  Açıklama
                </SiralaFiltreBaslik>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {h.id}
                </TableCell>
                {kolon.temelGorunur("tarih") && (
                  <TableCell className="text-muted-foreground">
                    {formatTarih(h.tarih)}
                  </TableCell>
                )}
                {kolon.temelGorunur("tur") && (
                  <TableCell>
                    <Badge variant="secondary" className={TUR_RENK[h.tur]}>
                      <span className="mr-1 inline-flex items-center">
                        {TUR_ICON[h.tur]}
                      </span>
                      {h.tur}
                    </Badge>
                  </TableCell>
                )}
                {kolon.temelGorunur("oge") && (
                  <TableCell className="font-medium">
                    {refAd(h.ref)}
                    <span className="ml-2 text-[10px] text-muted-foreground/70">
                      {h.ref.tip === "model" ? "Model" : "Malzeme"}
                    </span>
                  </TableCell>
                )}
                {kolon.temelGorunur("miktar") && (
                  <TableCell className="text-right tabular-nums">
                    {h.miktar}
                  </TableCell>
                )}
                {kolon.temelGorunur("birim") && (
                  <TableCell className="text-muted-foreground">
                    {h.birim}
                  </TableCell>
                )}
                {kolon.temelGorunur("depo") && (
                  <TableCell className="text-muted-foreground">
                    {h.depo}
                  </TableCell>
                )}
                {kolon.temelGorunur("aciklama") && (
                  <TableCell className="text-muted-foreground">
                    {h.aciklama}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={kolon.gorunurTemelSayisi}
                  className="h-24 text-center text-muted-foreground"
                >
                  Hareket bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} hareket
      </span>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}
