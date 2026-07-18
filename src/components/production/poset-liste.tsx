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

type SortKey =
  | "kod"
  | "ad"
  | "aciklama"
  | "urun"
  | "paket"
  | "malzeme"
  | "durum";

/** Ad çözümlemesi için sayfadan gelen hafif kayıt (model/parça). */
type AdKaydi = { id: string; ad: string };

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "kod", label: "Kod", aciklama: "Malzeme poşetinin kodu." },
  {
    key: "ad",
    label: "Malzeme Poşeti",
    aciklama: "Malzeme poşetinin adı.",
    kilitli: true,
  },
  { key: "aciklama", label: "Açıklama", aciklama: "Poşet açıklaması." },
  {
    key: "urun",
    label: "Ait Olduğu Ürün",
    aciklama: "Poşetin hazırlandığı model ya da parça.",
  },
  {
    key: "paket",
    label: "Paket",
    aciklama: "Poşetin içine konacağı parça paketi.",
  },
  { key: "malzeme", label: "Malzeme", aciklama: "Poşetteki malzeme sayısı." },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function PosetListe({
  posetler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  modeller = [],
  parcalar = [],
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  posetler: Poset[];
  /** Kolon ayarları (liste_ayar "posetler"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  /** "Ait olduğu ürün" kolonunda model adını göstermek için. */
  modeller?: AdKaydi[];
  /** "Ait olduğu ürün" ve "Paket" kolonlarında parça adı için. */
  parcalar?: AdKaydi[];
  yonetici?: boolean;
}) {
  const router = useRouter();
  const { onayla, uyar, onayDialog } = useOnay();
  const [liste, setListe] = usePropAynasi(posetler);
  // Kolon filtreleri (başlık popover'larından)
  const [kodFiltre, setKodFiltre] = React.useState("");
  const [adFiltre, setAdFiltre] = React.useState("");
  const [aciklamaFiltre, setAciklamaFiltre] = React.useState("");
  const [urunFiltre, setUrunFiltre] = React.useState("");
  const [paketFiltre, setPaketFiltre] = React.useState("");
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

  // Ad çözümleme — refTip'e göre model ya da parça adı, paket ise parça adı.
  const modelAdlari = React.useMemo(
    () => new Map(modeller.map((m) => [m.id, m.ad])),
    [modeller],
  );
  const parcaAdlari = React.useMemo(
    () => new Map(parcalar.map((p) => [p.id, p.ad])),
    [parcalar],
  );
  const urunAdi = React.useCallback(
    (p: Poset): string => {
      if (!p.refId) return "";
      const ad =
        p.refTip === "model"
          ? modelAdlari.get(p.refId)
          : parcaAdlari.get(p.refId);
      return ad ?? p.refId;
    },
    [modelAdlari, parcaAdlari],
  );
  const paketAdi = React.useCallback(
    (p: Poset): string =>
      p.paketParcaId ? (parcaAdlari.get(p.paketParcaId) ?? p.paketParcaId) : "",
    [parcaAdlari],
  );

  const filtreli = React.useMemo(() => {
    const qKod = kodFiltre.toLocaleLowerCase("tr");
    const qAd = adFiltre.toLocaleLowerCase("tr");
    const qAciklama = aciklamaFiltre.toLocaleLowerCase("tr");
    const qUrun = urunFiltre.toLocaleLowerCase("tr");
    const qPaket = paketFiltre.toLocaleLowerCase("tr");
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter(
      (p) =>
        (!qKod || p.id.toLocaleLowerCase("tr").includes(qKod)) &&
        (!qAd || p.ad.toLocaleLowerCase("tr").includes(qAd)) &&
        (!qAciklama ||
          (p.aciklama ?? "").toLocaleLowerCase("tr").includes(qAciklama)) &&
        (!qUrun || urunAdi(p).toLocaleLowerCase("tr").includes(qUrun)) &&
        (!qPaket || paketAdi(p).toLocaleLowerCase("tr").includes(qPaket)) &&
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
              : sort.key === "urun"
                ? urunAdi(p)
                : sort.key === "paket"
                  ? paketAdi(p)
                  : sort.key === "malzeme"
                    ? p.malzemeler.length
                    : p.durum;
      const va = deger(a);
      const vb = deger(b);
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
  }, [
    liste,
    kodFiltre,
    adFiltre,
    aciklamaFiltre,
    urunFiltre,
    paketFiltre,
    urunAdi,
    paketAdi,
    malzemeAralik,
    durum,
    sort,
  ]);

  async function sil(id: string) {
    const ad = liste.find((x) => x.id === id)?.ad;
    if (
      !(await onayla({
        title: `"${ad ?? "Malzeme poşeti"}" silinsin mi?`,
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
      await uyar({
        title: "Silinemedi",
        description: res.error ?? "Malzeme poşeti silinemedi",
      });
      return;
    }
    toast.success("Malzeme poşeti silindi");
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
            <Plus className="size-4" /> Yeni Malzeme Poşeti
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
                Malzeme Poşeti
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
              {kolon.temelGorunur("urun") && (
                <SiralaFiltreBaslik
                  sira={sira("urun")}
                  onSirala={sirala("urun")}
                  filtre={{
                    tip: "metin",
                    deger: urunFiltre,
                    onDeger: setUrunFiltre,
                  }}
                >
                  Ait Olduğu Ürün
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("paket") && (
                <SiralaFiltreBaslik
                  sira={sira("paket")}
                  onSirala={sirala("paket")}
                  filtre={{
                    tip: "metin",
                    deger: paketFiltre,
                    onDeger: setPaketFiltre,
                  }}
                >
                  Paket
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
                  {kolon.temelGorunur("urun") && (
                    <TableCell>
                      {p.refId ? (
                        <span className="flex items-center gap-1.5">
                          <Badge variant="secondary">
                            {p.refTip === "model" ? "Model" : "Parça"}
                          </Badge>
                          <span className="truncate">{urunAdi(p)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Genel</span>
                      )}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("paket") && (
                    <TableCell className="text-muted-foreground">
                      {paketAdi(p) || "—"}
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
                  Malzeme poşeti bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">
        {filtreli.length} malzeme poşeti
      </span>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}
