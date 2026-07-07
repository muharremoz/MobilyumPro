"use client";

import * as React from "react";
import { Plus, ClipboardList } from "lucide-react";
import { toast } from "sonner";

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
import { formatTarih } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SayimDurum = "Planlandı" | "Devam Ediyor" | "Tamamlandı";

type Sayim = {
  id: string;
  tarih: string;
  depo: string;
  sayilan: number;
  fark: number;
  durum: SayimDurum;
  sorumlu: string;
};

const ILK: Sayim[] = [
  { id: "SAY-2026-006", tarih: "2026-06-04", depo: "Ana Depo", sayilan: 312, fark: -3, durum: "Tamamlandı", sorumlu: "Ahmet Y." },
  { id: "SAY-2026-005", tarih: "2026-06-02", depo: "Yedek Depo", sayilan: 178, fark: 0, durum: "Tamamlandı", sorumlu: "Mehmet K." },
  { id: "SAY-2026-007", tarih: "2026-06-07", depo: "Showroom Merkez", sayilan: 0, fark: 0, durum: "Devam Ediyor", sorumlu: "Ayşe D." },
  { id: "SAY-2026-008", tarih: "2026-06-10", depo: "Ana Depo", sayilan: 0, fark: 0, durum: "Planlandı", sorumlu: "Ahmet Y." },
];

const DURUM_RENK: Record<SayimDurum, string> = {
  Planlandı: "bg-blue-100 text-blue-800",
  "Devam Ediyor": "bg-amber-100 text-amber-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
};

type SortKey = "id" | "tarih" | "depo" | "sayilan" | "fark" | "durum" | "sorumlu";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Sayım No", aciklama: "Sayım belge numarası.", kilitli: true },
  { key: "tarih", label: "Tarih", aciklama: "Sayımın tarihi." },
  { key: "depo", label: "Depo", aciklama: "Sayım yapılan depo." },
  { key: "sayilan", label: "Sayılan", aciklama: "Sayılan toplam miktar." },
  { key: "fark", label: "Fark", aciklama: "Kayıt ile sayım arasındaki fark." },
  {
    key: "durum",
    label: "Durum",
    aciklama: "Planlandı / Devam Ediyor / Tamamlandı.",
  },
  { key: "sorumlu", label: "Sorumlu", aciklama: "Sayımdan sorumlu kişi." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function StockCount({
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
} = {}) {
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", sorumlu: "" });
  const [depoF, setDepoF] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"sayilan" | "fark", { min: string; max: string }>
  >({ sayilan: { min: "", max: "" }, fark: { min: "", max: "" } });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "tarih", dir: "desc" },
  );

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "sayim",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const depolar = React.useMemo(
    () => [...new Set(ILK.map((s) => s.depo))],
    [],
  );

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = ILK.filter((s) => {
      const no = s.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const sor = s.sorumlu
        .toLowerCase()
        .includes(metinFiltre.sorumlu.toLowerCase());
      const dep = depoF === "Tümü" || s.depo === depoF;
      const d = durum === "Tümü" || s.durum === durum;
      const say = arada(s.sayilan, sayiFiltre.sayilan.min, sayiFiltre.sayilan.max);
      const frk = arada(s.fark, sayiFiltre.fark.min, sayiFiltre.fark.max);
      return no && sor && dep && d && say && frk;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [metinFiltre, depoF, durum, sayiFiltre, sort]);

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      {/* Tablo — proje standardı liste kartı */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Sayımlar">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            onClick={() => toast.success("Yeni sayım planlandı (demo)")}
          >
            <Plus className="size-4" /> Yeni Sayım
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
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList className="size-3.5 text-muted-foreground" />
                  Sayım No
                </span>
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("tarih") && (
                <SiralaFiltreBaslik
                  sira={sira("tarih")}
                  onSirala={sirala("tarih")}
                >
                  Tarih
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
              {kolon.temelGorunur("sayilan") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("sayilan")}
                  onSirala={sirala("sayilan")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.sayilan.min,
                    max: sayiFiltre.sayilan.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, sayilan: { min, max } })),
                  }}
                >
                  Sayılan
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("fark") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("fark")}
                  onSirala={sirala("fark")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.fark.min,
                    max: sayiFiltre.fark.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, fark: { min, max } })),
                  }}
                >
                  Fark
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Planlandı", "Devam Ediyor", "Tamamlandı"],
                    deger: durum,
                    onDeger: setDurum,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("sorumlu") && (
                <SiralaFiltreBaslik
                  sira={sira("sorumlu")}
                  onSirala={sirala("sorumlu")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.sorumlu,
                    onDeger: (v) =>
                      setMetinFiltre((f) => ({ ...f, sorumlu: v })),
                  }}
                >
                  Sorumlu
                </SiralaFiltreBaslik>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {s.id}
                </TableCell>
                {kolon.temelGorunur("tarih") && (
                  <TableCell className="text-muted-foreground">
                    {formatTarih(s.tarih)}
                  </TableCell>
                )}
                {kolon.temelGorunur("depo") && (
                  <TableCell className="font-medium">{s.depo}</TableCell>
                )}
                {kolon.temelGorunur("sayilan") && (
                  <TableCell className="text-right tabular-nums">
                    {s.sayilan}
                  </TableCell>
                )}
                {kolon.temelGorunur("fark") && (
                  <TableCell
                    className={
                      "text-right tabular-nums " +
                      (s.fark === 0
                        ? "text-muted-foreground"
                        : s.fark > 0
                          ? "text-emerald-600"
                          : "text-rose-600")
                    }
                  >
                    {s.fark > 0 ? `+${s.fark}` : s.fark}
                  </TableCell>
                )}
                {kolon.temelGorunur("durum") && (
                  <TableCell>
                    <Badge variant="secondary" className={DURUM_RENK[s.durum]}>
                      {s.durum}
                    </Badge>
                  </TableCell>
                )}
                {kolon.temelGorunur("sorumlu") && (
                  <TableCell className="text-muted-foreground">
                    {s.sorumlu}
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
                  Sayım bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} sayım
      </span>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}
