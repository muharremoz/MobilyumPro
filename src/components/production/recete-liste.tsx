"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Copy, Trash2, Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListHeader } from "@/components/ui/list-header";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { useSayfalama, SayfalamaKontrol } from "@/components/ui/sayfalama";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOnay } from "@/components/ui/confirm-dialog";
import { formatTL, type Malzeme, type Model, type Parca } from "@/lib/data";
import { parcaSil, receteKopyala } from "@/lib/db/actions";

const KATEGORILER = [
  "Karyola",
  "Komidin",
  "Şifonyer",
  "Gardırop",
  "Ayna",
  "Sehpa",
  "Koltuk",
  "Diğer",
];

type SortKey = "ad" | "kategori" | "bilesen" | "maliyet" | "kullanim" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "ad", label: "Reçete", aciklama: "Reçetenin adı.", kilitli: true },
  { key: "kategori", label: "Kategori", aciklama: "Reçetenin kategorisi." },
  { key: "bilesen", label: "Bileşen", aciklama: "Reçetedeki bileşen sayısı." },
  { key: "maliyet", label: "Maliyet", aciklama: "Fire dahil toplam maliyet." },
  {
    key: "kullanim",
    label: "Kullanım",
    aciklama: "Model ve reçetelerdeki kullanım sayısı.",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

/** Reçete maliyeti — fire dahil, özyinelemeli (döngü korumalı). */
export function receteMaliyeti(
  satirlar: Parca["recete"],
  malzemeMap: Map<string, Malzeme>,
  parcaMap: Map<string, Parca>,
  gezilen = new Set<string>(),
): number {
  let toplam = 0;
  for (const s of satirlar) {
    const brut = s.miktar * (1 + (s.fire ?? 0) / 100);
    if (s.bilesen.tip === "malzeme") {
      toplam += (malzemeMap.get(s.bilesen.ref)?.birimFiyat ?? 0) * brut;
    } else if (!gezilen.has(s.bilesen.ref)) {
      const alt = parcaMap.get(s.bilesen.ref);
      if (alt) {
        const g = new Set(gezilen);
        g.add(s.bilesen.ref);
        toplam += receteMaliyeti(alt.recete, malzemeMap, parcaMap, g) * brut;
      }
    }
  }
  return toplam;
}

export function ReceteListe({
  parcalar,
  malzemeler,
  modeller,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  parcalar: Parca[];
  malzemeler: Malzeme[];
  modeller: Model[];
  /** Kolon ayarları (liste_ayar "receteler"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();
  const [liste, setListe] = React.useState<Parca[]>(parcalar);
  // Kolon filtreleri (başlık popover'larından)
  const [adFiltre, setAdFiltre] = React.useState("");
  const [kategori, setKategori] = React.useState("Tümü");
  const [bilesenAralik, setBilesenAralik] = React.useState({
    min: "",
    max: "",
  });
  const [maliyetAralik, setMaliyetAralik] = React.useState({
    min: "",
    max: "",
  });
  const [kullanimAralik, setKullanimAralik] = React.useState({
    min: "",
    max: "",
  });
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "ad", dir: "asc" },
  );
  const [kopyaKaynak, setKopyaKaynak] = React.useState<Parca | null>(null);
  const [kopyaAd, setKopyaAd] = React.useState("");

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "receteler",
    yol: "/uretim/recete",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const parcaMap = React.useMemo(
    () => new Map(liste.map((p) => [p.id, p])),
    [liste],
  );

  // Kullanım sayısı: modellerde + başka reçetelerde alt reçete olarak.
  const kullanim = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const u of modeller)
      for (const ps of u.parcalar ?? [])
        m.set(ps.parcaId, (m.get(ps.parcaId) ?? 0) + 1);
    for (const p of liste)
      for (const r of p.recete)
        if (r.bilesen.tip === "parca")
          m.set(r.bilesen.ref, (m.get(r.bilesen.ref) ?? 0) + 1);
    return m;
  }, [liste, modeller]);

  const satirlar = React.useMemo(() => {
    const q = adFiltre.toLocaleLowerCase("tr");
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste
      .map((p) => ({
        p,
        maliyet: receteMaliyeti(p.recete, malzemeMap, parcaMap),
        kullanimSayisi: kullanim.get(p.id) ?? 0,
      }))
      .filter(
        (x) =>
          (!q || x.p.ad.toLocaleLowerCase("tr").includes(q)) &&
          (kategori === "Tümü" || x.p.kategori === kategori) &&
          arada(x.p.recete.length, bilesenAralik.min, bilesenAralik.max) &&
          arada(x.maliyet, maliyetAralik.min, maliyetAralik.max) &&
          arada(x.kullanimSayisi, kullanimAralik.min, kullanimAralik.max) &&
          (durum === "Tümü" || x.p.durum === durum),
      );
    const yon = sort.dir === "asc" ? 1 : -1;
    return arr.sort((a, b) => {
      const deger = (x: (typeof arr)[number]) =>
        sort.key === "ad"
          ? x.p.ad
          : sort.key === "kategori"
            ? x.p.kategori
            : sort.key === "bilesen"
              ? x.p.recete.length
              : sort.key === "maliyet"
                ? x.maliyet
                : sort.key === "kullanim"
                  ? x.kullanimSayisi
                  : x.p.durum;
      const va = deger(a);
      const vb = deger(b);
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
  }, [
    liste,
    adFiltre,
    kategori,
    bilesenAralik,
    maliyetAralik,
    kullanimAralik,
    durum,
    sort,
    malzemeMap,
    parcaMap,
    kullanim,
  ]);

  const sayfalama = useSayfalama(satirlar, "receteler");
  const { sayfalik, setSayfa } = sayfalama;
  // Filtre değişince ilk sayfaya dön.
  React.useEffect(
    () => setSayfa(1),
    [
      adFiltre,
      kategori,
      bilesenAralik,
      maliyetAralik,
      kullanimAralik,
      durum,
      setSayfa,
    ],
  );

  async function sil(p: Parca) {
    if (
      !(await onayla({
        title: `"${p.ad}" silinsin mi?`,
        description:
          "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const res = await parcaSil([p.id]);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    setListe((l) => l.filter((x) => x.id !== p.id));
    toast.success("Reçete silindi");
  }

  async function kopyala() {
    if (!kopyaKaynak) return;
    const res = await receteKopyala(kopyaKaynak.id, kopyaAd);
    setKopyaKaynak(null);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kopyalanamadı.");
      return;
    }
    toast.success("Reçete kopyalandı");
    router.push(`/parcalar/${res.id}`);
  }

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Reçeteler">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/parcalar/yeni" />}
          >
            <Plus className="size-4" /> Yeni Reçete
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <SiralaFiltreBaslik
                sira={sira("ad")}
                onSirala={sirala("ad")}
                filtre={{ tip: "metin", deger: adFiltre, onDeger: setAdFiltre }}
              >
                Reçete
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
              {kolon.temelGorunur("bilesen") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("bilesen")}
                  onSirala={sirala("bilesen")}
                  filtre={{
                    tip: "sayi",
                    min: bilesenAralik.min,
                    max: bilesenAralik.max,
                    onDegis: (min, max) => setBilesenAralik({ min, max }),
                  }}
                >
                  Bileşen
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("maliyet") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("maliyet")}
                  onSirala={sirala("maliyet")}
                  filtre={{
                    tip: "sayi",
                    min: maliyetAralik.min,
                    max: maliyetAralik.max,
                    onDegis: (min, max) => setMaliyetAralik({ min, max }),
                  }}
                >
                  Maliyet
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("kullanim") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("kullanim")}
                  onSirala={sirala("kullanim")}
                  filtre={{
                    tip: "sayi",
                    min: kullanimAralik.min,
                    max: kullanimAralik.max,
                    onDegis: (min, max) => setKullanimAralik({ min, max }),
                  }}
                >
                  Kullanım
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
            {sayfalik.map(({ p, maliyet, kullanimSayisi }) => (
              <SatirMenu
                key={p.id}
                className="w-44"
                aksiyonlar={[
                  {
                    etiket: "Düzenle",
                    ikon: Pencil,
                    onSecim: () => router.push(`/parcalar/${p.id}`),
                  },
                  {
                    etiket: "Kopyala",
                    ikon: Copy,
                    onSecim: () => {
                      setKopyaAd(`${p.ad} (kopya)`);
                      setKopyaKaynak(p);
                    },
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash2,
                    tehlike: true,
                    onSecim: () => sil(p),
                  },
                ]}
              >
                <TableRow
                  className="cursor-pointer"
                  onClick={() => router.push(`/parcalar/${p.id}`)}
                >
                  <TableCell className="font-medium">{p.ad}</TableCell>
                  {kolon.temelGorunur("kategori") && (
                    <TableCell className="text-muted-foreground">
                      {p.kategori}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("bilesen") && (
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {p.recete.length}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("maliyet") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatTL(maliyet)}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("kullanim") && (
                    <TableCell className="text-right">
                      {kullanimSayisi > 0 ? (
                        <Badge variant="secondary" className="tabular-nums">
                          {kullanimSayisi} yerde
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={kolon.gorunurTemelSayisi}
                  className="h-24 text-center text-muted-foreground"
                >
                  Reçete bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{satirlar.length} reçete</span>
        <SayfalamaKontrol sayfalama={sayfalama} />
      </div>

      {/* Kopyala dialogu */}
      <Dialog
        open={kopyaKaynak !== null}
        onOpenChange={(v) => !v && setKopyaKaynak(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Copy className="size-4 text-muted-foreground" /> Reçeteyi Kopyala
            </DialogTitle>
            <DialogDescription>
              &quot;{kopyaKaynak?.ad}&quot; tüm bileşenleriyle yeni bir reçete
              olarak kopyalanır ve düzenleme sayfası açılır.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Yeni reçete adı"
            value={kopyaAd}
            onChange={(e) => setKopyaAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void kopyala();
              }
            }}
          />
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKopyaKaynak(null)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={kopyala} disabled={!kopyaAd.trim()}>
              <Check className="size-3.5" /> Kopyala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}
