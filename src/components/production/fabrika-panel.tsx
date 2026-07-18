"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, Boxes, ChevronsRight, Play } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import { SekmeButonu } from "@/components/ui/sekme-butonu";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { SatirMenu } from "@/components/ui/satir-menu";
import { useOnay } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { aktifIstasyon, type FabrikaEmri, type Istasyon } from "@/lib/fabrika";
import { emriIlerlet, emriIptalEt } from "@/lib/db/actions";
import { FabrikaGorunum } from "@/components/production/fabrika-gorunum";

const DURUM_RENK: Record<string, string> = {
  Planlandı: "bg-slate-100 text-slate-700",
  Üretimde: "bg-amber-100 text-amber-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
  İptal: "bg-rose-100 text-rose-800",
};

type Sekme = "hat" | "3d";
type SortKey = "id" | "model" | "adet" | "istasyon" | "durum";

/** Fabrika sayfası: Üretim Hattı listesi + Fabrika 3D sekmesi. */
export function FabrikaPanel({
  emirler,
  istasyonlar,
}: {
  emirler: FabrikaEmri[];
  istasyonlar: Istasyon[];
}) {
  const router = useRouter();
  const { onayla, uyar, onayDialog } = useOnay();
  const [sekme, setSekme] = React.useState<Sekme>("hat");
  // 3D sahne ağır — ilk açılışta kurulur, sonra gizlenerek canlı tutulur.
  const [sahneKuruldu, setSahneKuruldu] = React.useState(false);
  const [ilerleyen, setIlerleyen] = React.useState<string | null>(null);

  const istasyonMap = React.useMemo(
    () => new Map(istasyonlar.map((i) => [i.slug, i])),
    [istasyonlar],
  );

  // Kolon filtreleri
  const [metin, setMetin] = React.useState("");
  const [istasyonF, setIstasyonF] = React.useState("Tümü");
  const [durumF, setDurumF] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "desc" },
  );

  // Liste periyodik tazelenir (sahnedeki davranışın aynısı).
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const filtreli = React.useMemo(() => {
    const q = metin.toLowerCase();
    const arr = emirler.filter((e) => {
      const m =
        e.id.toLowerCase().includes(q) || e.modelAd.toLowerCase().includes(q);
      const ist = aktifIstasyon(e);
      const istAd = ist ? (istasyonMap.get(ist)?.ad ?? ist) : "—";
      const i = istasyonF === "Tümü" || istAd === istasyonF;
      const d = durumF === "Tümü" || e.durum === durumF;
      return m && i && d;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "adet") return (a.adet - b.adet) * yon;
      if (sort.key === "model")
        return a.modelAd.localeCompare(b.modelAd, "tr") * yon;
      if (sort.key === "istasyon") {
        const ia = aktifIstasyon(a) ?? "";
        const ib = aktifIstasyon(b) ?? "";
        return ia.localeCompare(ib, "tr") * yon;
      }
      if (sort.key === "durum")
        return a.durum.localeCompare(b.durum, "tr") * yon;
      return a.id.localeCompare(b.id, "tr") * yon;
    });
  }, [emirler, metin, istasyonF, durumF, sort, istasyonMap]);

  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  async function ilerlet(e: FabrikaEmri) {
    setIlerleyen(e.id);
    const res = await emriIlerlet(e.id);
    setIlerleyen(null);
    if (!res.ok) {
      await uyar({
        title: "İlerletilemedi",
        description: [
          res.error ?? "Emir ilerletilemedi.",
          ...(res.eksikler?.map(
            (x) =>
              `${x.ad}: gereken ${x.gereken.toFixed(1)} ${x.birim}, eldeki ${x.eldeki.toFixed(1)}`,
          ) ?? []),
        ].join(" · "),
      });
      return;
    }
    if (res.eksikler?.length) {
      toast.warning("Emir ilerledi — stok negatife düştü", {
        description: res.eksikler
          .map((x) => `${x.ad}: ${x.eldeki.toFixed(1)} ${x.birim}`)
          .join(" · "),
      });
    } else {
      toast.success(`${e.id} ilerledi`);
    }
    router.refresh();
  }

  async function iptalEt(e: FabrikaEmri) {
    if (
      !(await onayla({
        title: `${e.id} iptal edilsin mi?`,
        description: `${e.modelAd} × ${e.adet} emri iptal edilecek.`,
        confirmLabel: "İptal Et",
      }))
    )
      return;
    const res = await emriIptalEt(e.id);
    if (!res.ok) {
      await uyar({
        title: "İptal edilemedi",
        description: res.error ?? "Emir iptal edilemedi.",
      });
      return;
    }
    toast.success(`${e.id} iptal edildi`);
    router.refresh();
  }

  const istasyonAdlari = istasyonlar.map((i) => i.ad);
  const durumlar = ["Planlandı", "Üretimde", "Tamamlandı", "İptal"];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Sekmeler */}
      <div className="flex shrink-0 items-center gap-1 border-b">
        <SekmeButonu
          aktif={sekme === "hat"}
          onClick={() => setSekme("hat")}
          layoutId="fabrikaSekme"
        >
          Üretim Hattı
        </SekmeButonu>
        <SekmeButonu
          aktif={sekme === "3d"}
          onClick={() => {
            setSekme("3d");
            setSahneKuruldu(true);
          }}
          layoutId="fabrikaSekme"
        >
          Fabrika 3D
        </SekmeButonu>
      </div>

      {/* ── Üretim Hattı listesi ── */}
      <div
        className={cn(
          "min-h-0 flex-1 flex-col gap-3",
          sekme === "hat" ? "flex" : "hidden",
        )}
      >
        <div className="overflow-hidden rounded-md border bg-card">
          <ListHeader title="Üretim Hattı" />
          <Table>
            <TableHeader>
              <TableRow>
                <SiralaFiltreBaslik
                  sira={sira("id")}
                  onSirala={sirala("id")}
                  filtre={{ tip: "metin", deger: metin, onDeger: setMetin }}
                >
                  Emir No
                </SiralaFiltreBaslik>
                <SiralaFiltreBaslik
                  sira={sira("model")}
                  onSirala={sirala("model")}
                >
                  Model / Parça
                </SiralaFiltreBaslik>
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("adet")}
                  onSirala={sirala("adet")}
                >
                  Adet
                </SiralaFiltreBaslik>
                <TableHead>Öncelik</TableHead>
                <SiralaFiltreBaslik
                  sira={sira("istasyon")}
                  onSirala={sirala("istasyon")}
                  filtre={{
                    tip: "liste",
                    secenekler: istasyonAdlari,
                    deger: istasyonF,
                    onDeger: setIstasyonF,
                  }}
                >
                  İstasyon
                </SiralaFiltreBaslik>
                <TableHead className="w-44">İlerleme</TableHead>
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: durumlar,
                    deger: durumF,
                    onDeger: setDurumF,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtreli.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Üretim emri yok. Üretim Planlama&apos;dan emir
                    oluşturabilirsiniz.
                  </TableCell>
                </TableRow>
              ) : (
                filtreli.map((e) => {
                  const aktifSlug = aktifIstasyon(e);
                  const aktif = aktifSlug ? istasyonMap.get(aktifSlug) : null;
                  const tamam = e.adimlar.filter(
                    (a) => a.durum === "Tamamlandı",
                  ).length;
                  const isleniyor = e.adimlar.some(
                    (a) => a.durum === "İşleniyor",
                  );
                  const bitti = e.durum === "Tamamlandı";
                  const iptal = e.durum === "İptal";
                  const ilerletilebilir =
                    !bitti && !iptal && e.adimlar.length > 0;
                  return (
                    <SatirMenu
                      key={e.id}
                      aksiyonlar={[
                        {
                          etiket: isleniyor ? "İlerlet" : "Üretimi Başlat",
                          ikon: isleniyor ? ChevronsRight : Play,
                          gizli: !ilerletilebilir,
                          pasif: ilerleyen === e.id,
                          onSecim: () => ilerlet(e),
                        },
                        {
                          etiket: "Fabrikada Gör",
                          ikon: Boxes,
                          onSecim: () => {
                            setSekme("3d");
                            setSahneKuruldu(true);
                          },
                        },
                        {
                          etiket: "İptal Et",
                          ikon: Ban,
                          tehlike: true,
                          ayracOnce: true,
                          gizli: bitti || iptal,
                          onSecim: () => iptalEt(e),
                        },
                      ]}
                    >
                      <TableRow>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {e.id}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {e.modelAd}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {e.adet}
                        </TableCell>
                        <TableCell>
                          {e.oncelik ? (
                            <Badge
                              variant="secondary"
                              className={
                                e.oncelik === "Acil"
                                  ? "bg-rose-100 text-rose-800"
                                  : e.oncelik === "Yüksek"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-muted text-muted-foreground"
                              }
                            >
                              {e.oncelik}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {bitti || !aktif ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: aktif.renk }}
                              />
                              {aktif.ad}
                              {!isleniyor && (
                                <span className="text-xs text-muted-foreground">
                                  (sırada)
                                </span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="flex gap-0.5">
                              {e.adimlar.map((a) => (
                                <span
                                  key={a.sira}
                                  title={istasyonMap.get(a.istasyon)?.ad}
                                  className={cn(
                                    "h-1.5 w-3.5 rounded-full",
                                    a.durum === "Tamamlandı"
                                      ? "bg-emerald-500"
                                      : a.durum === "İşleniyor"
                                        ? "bg-amber-500"
                                        : "bg-muted",
                                  )}
                                />
                              ))}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {tamam}/{e.adimlar.length}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              DURUM_RENK[e.durum] ??
                              "bg-muted text-muted-foreground"
                            }
                          >
                            {e.durum}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ilerletilebilir && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={ilerleyen === e.id}
                              onClick={() => ilerlet(e)}
                            >
                              {isleniyor ? (
                                <ChevronsRight className="size-3.5" />
                              ) : (
                                <Play className="size-3.5" />
                              )}
                              {isleniyor ? "İlerlet" : "Başlat"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    </SatirMenu>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {filtreli.length} emir
        </span>
      </div>

      {/* ── Fabrika 3D ── */}
      {(sahneKuruldu || sekme === "3d") && (
        <div
          className={cn("min-h-0 flex-1", sekme === "3d" ? "block" : "hidden")}
        >
          <FabrikaGorunum emirler={emirler} istasyonlar={istasyonlar} />
        </div>
      )}

      {onayDialog}
    </div>
  );
}
