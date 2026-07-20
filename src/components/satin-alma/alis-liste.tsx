"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye } from "lucide-react";

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
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL, formatTarih, type Alis } from "@/lib/data";
import { useYetki, useYonetici } from "@/components/yetki/yetki-baglam";
import { usePara } from "@/components/bicim-baglam";

type SortKey = "id" | "tarih" | "cariAd" | "depo" | "kalem" | "toplam";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  {
    key: "id",
    label: "Belge No",
    aciklama: "Alış belge numarası (ALS-####).",
    kilitli: true,
  },
  { key: "tarih", label: "Tarih", aciklama: "Alış tarihi." },
  { key: "cariAd", label: "Tedarikçi", aciklama: "Alışın yapıldığı cari." },
  { key: "depo", label: "Depo", aciklama: "Stok girişinin yapıldığı depo." },
  { key: "kalem", label: "Kalem", aciklama: "Alıştaki malzeme satırı sayısı." },
  { key: "toplam", label: "Tutar", aciklama: "Alışın toplam tutarı (TL)." },
];
const EK_KOLONLAR: (KolonTanim & {
  hucre: (a: Alis) => React.ReactNode;
})[] = [
  {
    key: "belgeNo",
    label: "Tedarikçi Belgesi",
    aciklama: "Tedarikçinin fatura/irsaliye numarası.",
    hucre: (a) => a.belgeNo ?? <span className="text-muted-foreground">—</span>,
  },
];

const BOS_KULLANICILAR: { id: string; ad: string }[] = [];

export function AlisListe({
  alislar,
  kolonAyari,
  kullanicilar = BOS_KULLANICILAR,
  mevcutKullaniciId = "",
}: {
  alislar: Alis[];
  /** Kolon ayarları (liste_ayar "alislar"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
}) {
  const para = usePara();
  // Kolon ayarı tüm kullanıcıları etkiler; yalnız yöneticiye açık.
  const yonetici = useYonetici();
  const yetki = useYetki("satin-alma");
  const router = useRouter();
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", cariAd: "" });
  const [depoF, setDepoF] = React.useState("Tümü");
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"kalem" | "toplam", { min: string; max: string }>
  >({ kalem: { min: "", max: "" }, toplam: { min: "", max: "" } });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "tarih", dir: "desc" },
  );

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "alislar",
    yol: "/satin-alma",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });
  const gorunurEk = EK_KOLONLAR.filter((k) => kolon.ekGorunur(k.key));

  // Depo filtresi seçenekleri — veriden türetilir.
  const depoSecenekleri = React.useMemo(
    () =>
      [...new Set(alislar.map((a) => a.depo))].sort((a, b) =>
        a.localeCompare(b, "tr"),
      ),
    [alislar],
  );

  const filtreli = React.useMemo(() => {
    const qId = metinFiltre.id.toLocaleLowerCase("tr");
    const qCari = metinFiltre.cariAd.toLocaleLowerCase("tr");
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = alislar.filter(
      (a) =>
        (!qId || a.id.toLocaleLowerCase("tr").includes(qId)) &&
        (!qCari || a.cariAd.toLocaleLowerCase("tr").includes(qCari)) &&
        (depoF === "Tümü" || a.depo === depoF) &&
        arada(a.satirlar.length, sayiFiltre.kalem.min, sayiFiltre.kalem.max) &&
        arada(a.toplam, sayiFiltre.toplam.min, sayiFiltre.toplam.max),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const deger = (x: Alis): string | number =>
        sort.key === "kalem"
          ? x.satirlar.length
          : sort.key === "toplam"
            ? x.toplam
            : x[sort.key];
      const va = deger(a);
      const vb = deger(b);
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
  }, [alislar, metinFiltre, depoF, sayiFiltre, sort]);

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Satın Almalar">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          {yetki.isAdd && (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/satin-alma/yeni" />}
            >
              <Plus className="size-4" /> Yeni Alış
            </Button>
          )}
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
                Belge No
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("tarih") && (
                <SiralaFiltreBaslik
                  sira={sira("tarih")}
                  onSirala={sirala("tarih")}
                >
                  Tarih
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("cariAd") && (
                <SiralaFiltreBaslik
                  sira={sira("cariAd")}
                  onSirala={sirala("cariAd")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.cariAd,
                    onDeger: (v) =>
                      setMetinFiltre((f) => ({ ...f, cariAd: v })),
                  }}
                >
                  Tedarikçi
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("depo") && (
                <SiralaFiltreBaslik
                  sira={sira("depo")}
                  onSirala={sirala("depo")}
                  filtre={{
                    tip: "liste",
                    secenekler: depoSecenekleri,
                    deger: depoF,
                    onDeger: setDepoF,
                  }}
                >
                  Depo
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("kalem") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("kalem")}
                  onSirala={sirala("kalem")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.kalem.min,
                    max: sayiFiltre.kalem.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, kalem: { min, max } })),
                  }}
                >
                  Kalem
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("toplam") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("toplam")}
                  onSirala={sirala("toplam")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.toplam.min,
                    max: sayiFiltre.toplam.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, toplam: { min, max } })),
                  }}
                >
                  Tutar
                </SiralaFiltreBaslik>
              )}
              {gorunurEk.map((k) => (
                <TableHead key={k.key}>{k.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((a) => (
              <SatirMenu
                key={a.id}
                aksiyonlar={[
                  {
                    etiket: "Görüntüle",
                    ikon: Eye,
                    onSecim: () => router.push(`/satin-alma/${a.id}`),
                  },
                ]}
              >
                <TableRow
                  className="cursor-pointer"
                  onClick={() => router.push(`/satin-alma/${a.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.id}
                  </TableCell>
                  {kolon.temelGorunur("tarih") && (
                    <TableCell className="text-muted-foreground">
                      {formatTarih(a.tarih)}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("cariAd") && (
                    <TableCell className="font-medium">{a.cariAd}</TableCell>
                  )}
                  {kolon.temelGorunur("depo") && (
                    <TableCell className="text-muted-foreground">
                      {a.depo}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("kalem") && (
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {a.satirlar.length}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("toplam") && (
                    <TableCell className="text-right tabular-nums">
                      {para(a.toplam)}
                    </TableCell>
                  )}
                  {gorunurEk.map((k) => (
                    <TableCell key={k.key}>{k.hucre(a)}</TableCell>
                  ))}
                </TableRow>
              </SatirMenu>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={kolon.gorunurTemelSayisi + gorunurEk.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Henüz alış kaydı yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">
        {filtreli.length} alış
      </span>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}
