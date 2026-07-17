"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOnay } from "@/components/ui/confirm-dialog";
import type { Poset } from "@/lib/data";
import { posetSil } from "@/lib/db/actions";
import { usePropAynasi } from "@/hooks/use-prop-aynasi";

type SortKey = "kod" | "ad" | "aciklama" | "malzeme" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "kod", label: "Kod", aciklama: "Poşetin kodu." },
  { key: "ad", label: "Poşet", aciklama: "Poşetin adı.", kilitli: true },
  { key: "aciklama", label: "Açıklama", aciklama: "Poşet açıklaması." },
  { key: "malzeme", label: "Malzeme", aciklama: "Poşetteki malzeme sayısı." },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function PosetListe({
  posetler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  posetler: Poset[];
  /** Kolon ayarları (liste_ayar "posetler"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();
  const [liste, setListe] = usePropAynasi(posetler);
  // Kolon filtreleri (başlık popover'larından)
  const [kodFiltre, setKodFiltre] = React.useState("");
  const [adFiltre, setAdFiltre] = React.useState("");
  const [aciklamaFiltre, setAciklamaFiltre] = React.useState("");
  const [malzemeAralik, setMalzemeAralik] = React.useState({
    min: "",
    max: "",
  });
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "kod", dir: "asc" },
  );


  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "posetler",
    yol: "/uretim/poset",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const filtreli = React.useMemo(() => {
    const qKod = kodFiltre.toLocaleLowerCase("tr");
    const qAd = adFiltre.toLocaleLowerCase("tr");
    const qAciklama = aciklamaFiltre.toLocaleLowerCase("tr");
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter(
      (p) =>
        (!qKod || p.id.toLocaleLowerCase("tr").includes(qKod)) &&
        (!qAd || p.ad.toLocaleLowerCase("tr").includes(qAd)) &&
        (!qAciklama ||
          (p.aciklama ?? "").toLocaleLowerCase("tr").includes(qAciklama)) &&
        arada(p.malzemeler.length, malzemeAralik.min, malzemeAralik.max) &&
        (durum === "Tümü" || p.durum === durum),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const deger = (p: Poset) =>
        sort.key === "kod"
          ? p.id
          : sort.key === "ad"
            ? p.ad
            : sort.key === "aciklama"
              ? (p.aciklama ?? "")
              : sort.key === "malzeme"
                ? p.malzemeler.length
                : p.durum;
      const va = deger(a);
      const vb = deger(b);
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
  }, [liste, kodFiltre, adFiltre, aciklamaFiltre, malzemeAralik, durum, sort]);

  async function sil(id: string) {
    const ad = liste.find((x) => x.id === id)?.ad;
    if (
      !(await onayla({
        title: `"${ad ?? "Poşet"}" silinsin mi?`,
        description:
          "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== id));
    const res = await posetSil([id]);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Poşet silinemedi");
      return;
    }
    toast.success("Poşet silindi");
  }

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Malzeme Poşetleri">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/uretim/poset/yeni" />}
          >
            <Plus className="size-4" /> Yeni Poşet
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {kolon.temelGorunur("kod") && (
                <SiralaFiltreBaslik
                  sira={sira("kod")}
                  onSirala={sirala("kod")}
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
                Poşet
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("aciklama") && (
                <SiralaFiltreBaslik
                  sira={sira("aciklama")}
                  onSirala={sirala("aciklama")}
                  filtre={{
                    tip: "metin",
                    deger: aciklamaFiltre,
                    onDeger: setAciklamaFiltre,
                  }}
                >
                  Açıklama
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("malzeme") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("malzeme")}
                  onSirala={sirala("malzeme")}
                  filtre={{
                    tip: "sayi",
                    min: malzemeAralik.min,
                    max: malzemeAralik.max,
                    onDegis: (min, max) => setMalzemeAralik({ min, max }),
                  }}
                >
                  Malzeme
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((p) => (
              <SatirMenu
                key={p.id}
                aksiyonlar={[
                  {
                    etiket: "Düzenle",
                    ikon: Pencil,
                    onSecim: () => router.push(`/uretim/poset/${p.id}`),
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash2,
                    tehlike: true,
                    ayracOnce: true,
                    onSecim: () => sil(p.id),
                  },
                ]}
              >
                <TableRow
                  className="cursor-pointer"
                  onClick={() => router.push(`/uretim/poset/${p.id}`)}
                >
                  {kolon.temelGorunur("kod") && (
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.id}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{p.ad}</TableCell>
                  {kolon.temelGorunur("aciklama") && (
                    <TableCell className="text-muted-foreground">
                      {p.aciklama ?? "—"}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("malzeme") && (
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {p.malzemeler.length}
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
                </TableRow>
              </SatirMenu>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={kolon.gorunurTemelSayisi}
                  className="h-24 text-center text-muted-foreground"
                >
                  Poşet bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">
        {filtreli.length} poşet
      </span>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}
