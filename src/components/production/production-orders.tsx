"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Factory, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { emriIlerlet, emriIptalEt } from "@/lib/db/actions";
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
  type UretimEmri,
  type UretimDurum,
  type UretimOncelik,
} from "@/lib/data";

const DURUMLAR: UretimDurum[] = [
  "Planlandı",
  "Üretimde",
  "Tamamlandı",
  "İptal",
];

const ONCELIKLER: UretimOncelik[] = ["Düşük", "Normal", "Yüksek", "Acil"];

const DURUM_RENK: Record<UretimDurum, string> = {
  Planlandı: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Üretimde: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Tamamlandı:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  İptal: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

const ONCELIK_RENK: Record<UretimOncelik, string> = {
  Düşük: "bg-muted text-muted-foreground",
  Normal: "bg-slate-100 text-slate-700",
  Yüksek: "bg-orange-100 text-orange-800",
  Acil: "bg-rose-100 text-rose-800",
};

function UretimBadge({ durum }: { durum: UretimDurum }) {
  return (
    <Badge variant="secondary" className={DURUM_RENK[durum]}>
      {durum}
    </Badge>
  );
}

/** Emrin hedefi: müşteri, depo ya da kaynak sipariş. */
const hedefStr = (e: UretimEmri) =>
  e.musteri ?? e.hedefDepo ?? e.kaynakSiparis ?? "";

type SortKey =
  | "id"
  | "urunAd"
  | "adet"
  | "durum"
  | "oncelik"
  | "olusturma"
  | "termin"
  | "hedef";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  {
    key: "id",
    label: "Emir No",
    aciklama: "Üretim emrinin numarası.",
    kilitli: true,
  },
  { key: "urunAd", label: "Model", aciklama: "Üretilecek model." },
  { key: "adet", label: "Adet", aciklama: "Üretilecek adet." },
  { key: "durum", label: "Durum", aciklama: "Üretim emrinin durumu." },
  { key: "oncelik", label: "Öncelik", aciklama: "Üretim önceliği." },
  { key: "olusturma", label: "Oluşturma", aciklama: "Emrin oluşturma tarihi." },
  { key: "termin", label: "Termin", aciklama: "Hedef bitiş tarihi." },
  {
    key: "hedef",
    label: "Hedef",
    aciklama: "Hedef müşteri, depo veya kaynak sipariş.",
  },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function ProductionOrders({
  emirler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  emirler: UretimEmri[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const router = useRouter();
  // Context menu aksiyonları
  const [ilerleyen, setIlerleyen] = React.useState<string | null>(null);
  const [iptalEmir, setIptalEmir] = React.useState<UretimEmri | null>(null);
  // Kolon filtreleri (başlık popover'larından)
  const [noFiltre, setNoFiltre] = React.useState("");
  const [modelFiltre, setModelFiltre] = React.useState("");
  const [adetAralik, setAdetAralik] = React.useState({ min: "", max: "" });
  const [durum, setDurum] = React.useState("Tümü");
  const [oncelik, setOncelik] = React.useState("Tümü");
  const [hedefFiltre, setHedefFiltre] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "id",
    dir: "desc",
  });

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "uretim-emirleri",
    yol: "/uretim/emirler",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const filtreli = React.useMemo(() => {
    const qNo = noFiltre.toLowerCase();
    const qModel = modelFiltre.toLowerCase();
    const qHedef = hedefFiltre.toLowerCase();
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = emirler.filter((e) => {
      const no = e.id.toLowerCase().includes(qNo);
      const model = e.urunAd.toLowerCase().includes(qModel);
      const adet = arada(e.adet, adetAralik.min, adetAralik.max);
      const d = durum === "Tümü" || e.durum === durum;
      const o = oncelik === "Tümü" || e.oncelik === oncelik;
      const h = hedefStr(e).toLowerCase().includes(qHedef);
      return no && model && adet && d && o && h;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    const deger = (e: UretimEmri): string | number => {
      if (sort.key === "hedef") return hedefStr(e);
      const v = e[sort.key];
      return v ?? "";
    };
    return [...arr].sort((a, b) => {
      const x = deger(a);
      const y = deger(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [emirler, noFiltre, modelFiltre, adetAralik, durum, oncelik, hedefFiltre, sort]);

  async function ilerlet(e: UretimEmri) {
    setIlerleyen(e.id);
    const res = await emriIlerlet(e.id);
    setIlerleyen(null);
    if (!res.ok) {
      toast.error(res.error ?? "İlerletilemedi.", {
        description: res.eksikler
          ?.map(
            (x) =>
              `${x.ad}: gereken ${x.gereken.toFixed(1)} ${x.birim}, eldeki ${x.eldeki.toFixed(1)}`,
          )
          .join(" · "),
      });
      return;
    }
    if (res.eksikler?.length) {
      toast.warning("Emir ilerledi — stok negatife düştü", {
        description: res.eksikler
          .map(
            (x) =>
              `${x.ad}: gereken ${x.gereken.toFixed(1)} ${x.birim}, eldeki ${x.eldeki.toFixed(1)}`,
          )
          .join(" · "),
      });
    } else {
      toast.success("Emir ilerletildi");
    }
    router.refresh();
  }

  async function iptalEt() {
    if (!iptalEmir) return;
    const res = await emriIptalEt(iptalEmir.id);
    setIptalEmir(null);
    if (!res.ok) {
      toast.error(res.error ?? "İptal edilemedi.");
      return;
    }
    toast.success("Emir iptal edildi");
    router.refresh();
  }

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      {/* Liste — proje standardı liste kartı */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Üretim Emirleri">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/uretim/plan" />}
          >
            <Plus className="size-4" /> Yeni Üretim Emri
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <SiralaFiltreBaslik
                sira={sira("id")}
                onSirala={sirala("id")}
                filtre={{ tip: "metin", deger: noFiltre, onDeger: setNoFiltre }}
              >
                Emir No
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("urunAd") && (
                <SiralaFiltreBaslik
                  sira={sira("urunAd")}
                  onSirala={sirala("urunAd")}
                  filtre={{
                    tip: "metin",
                    deger: modelFiltre,
                    onDeger: setModelFiltre,
                  }}
                >
                  Model
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("adet") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("adet")}
                  onSirala={sirala("adet")}
                  filtre={{
                    tip: "sayi",
                    min: adetAralik.min,
                    max: adetAralik.max,
                    onDegis: (min, max) => setAdetAralik({ min, max }),
                  }}
                >
                  Adet
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: DURUMLAR,
                    deger: durum,
                    onDeger: setDurum,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("oncelik") && (
                <SiralaFiltreBaslik
                  sira={sira("oncelik")}
                  onSirala={sirala("oncelik")}
                  filtre={{
                    tip: "liste",
                    secenekler: ONCELIKLER,
                    deger: oncelik,
                    onDeger: setOncelik,
                  }}
                >
                  Öncelik
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("olusturma") && (
                <SiralaFiltreBaslik
                  sira={sira("olusturma")}
                  onSirala={sirala("olusturma")}
                >
                  Oluşturma
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("termin") && (
                <SiralaFiltreBaslik
                  sira={sira("termin")}
                  onSirala={sirala("termin")}
                >
                  Termin
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("hedef") && (
                <SiralaFiltreBaslik
                  sira={sira("hedef")}
                  onSirala={sirala("hedef")}
                  filtre={{
                    tip: "metin",
                    deger: hedefFiltre,
                    onDeger: setHedefFiltre,
                  }}
                >
                  Hedef
                </SiralaFiltreBaslik>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={kolon.gorunurTemelSayisi}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((e) => (
                <ContextMenu key={e.id}>
                  <ContextMenuTrigger render={<TableRow />}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.id}
                  </TableCell>
                  {kolon.temelGorunur("urunAd") && (
                    <TableCell className="font-medium">{e.urunAd}</TableCell>
                  )}
                  {kolon.temelGorunur("adet") && (
                    <TableCell className="text-right tabular-nums">
                      {e.adet}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("durum") && (
                    <TableCell>
                      <UretimBadge durum={e.durum} />
                    </TableCell>
                  )}
                  {kolon.temelGorunur("oncelik") && (
                    <TableCell>
                      {e.oncelik ? (
                        <Badge
                          variant="secondary"
                          className={ONCELIK_RENK[e.oncelik]}
                        >
                          {e.oncelik}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("olusturma") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTarih(e.olusturma)}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("termin") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {e.terminBaslangic && e.termin
                        ? `${formatTarih(e.terminBaslangic)} – ${formatTarih(e.termin)}`
                        : e.termin
                          ? formatTarih(e.termin)
                          : "—"}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("hedef") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {hedefStr(e) || "—"}
                    </TableCell>
                  )}
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    {(e.durum === "Planlandı" || e.durum === "Üretimde") && (
                      <ContextMenuItem
                        disabled={ilerleyen === e.id}
                        onClick={() => ilerlet(e)}
                      >
                        <ArrowRight className="mr-2 size-4" />
                        {e.durum === "Planlandı" ? "Üretimi Başlat" : "İlerlet"}
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem
                      onClick={() => router.push("/uretim/fabrika")}
                    >
                      <Factory className="mr-2 size-4" /> Fabrikada Gör
                    </ContextMenuItem>
                    {(e.durum === "Planlandı" || e.durum === "Üretimde") && (
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => setIptalEmir(e)}
                      >
                        <Ban className="mr-2 size-4" /> İptal Et
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtreli.length} emir
      </div>

      {/* İptal onayı */}
      <Dialog
        open={iptalEmir !== null}
        onOpenChange={(o) => !o && setIptalEmir(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Emri iptal et</DialogTitle>
            <DialogDescription>
              {iptalEmir && (
                <>
                  <span className="font-mono text-xs">{iptalEmir.id}</span> ·{" "}
                  {iptalEmir.urunAd} × {iptalEmir.adet} iptal edilecek.
                  {iptalEmir.durum === "Üretimde" &&
                    " Üretimde düşülen stoklar şimdilik iade edilmez."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIptalEmir(null)}
            >
              Vazgeç
            </Button>
            <Button size="sm" variant="destructive" onClick={iptalEt}>
              <Ban className="size-3.5" /> İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}
