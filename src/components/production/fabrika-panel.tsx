"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Boxes,
  ChevronsRight,
  History,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import { FormSheet } from "@/components/ui/form-sheet";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SekmeButonu } from "@/components/ui/sekme-butonu";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { SatirMenu } from "@/components/ui/satir-menu";
import { IlerletDialog } from "@/components/production/ilerlet-dialog";
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

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Emir No", aciklama: "Üretim emrinin numarası." },
  {
    key: "model",
    label: "Model / Parça",
    aciklama: "Üretilen modelin veya parçanın adı.",
    kilitli: true,
  },
  { key: "adet", label: "Adet", aciklama: "Emirdeki üretim adedi." },
  { key: "oncelik", label: "Öncelik", aciklama: "Emrin öncelik derecesi." },
  {
    key: "istasyon",
    label: "İstasyon",
    aciklama: "Emrin şu an bulunduğu istasyon.",
  },
  {
    key: "ilerleme",
    label: "İlerleme",
    aciklama: "Tamamlanan adımların rota üzerindeki durumu.",
  },
  { key: "durum", label: "Durum", aciklama: "Emrin genel durumu." },
];

const EK_KOLONLAR: KolonTanim[] = [];

/** Fabrika sayfası: Üretim Hattı listesi + Fabrika 3D sekmesi. */
export function FabrikaPanel({
  emirler,
  istasyonlar,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
}: {
  emirler: FabrikaEmri[];
  istasyonlar: Istasyon[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
}) {
  const router = useRouter();
  const { onayla, uyar, onayDialog } = useOnay();
  const [sekme, setSekme] = React.useState<Sekme>("hat");
  // 3D sahne ağır — ilk açılışta kurulur, sonra gizlenerek canlı tutulur.
  const [sahneKuruldu, setSahneKuruldu] = React.useState(false);
  const [ilerleyen, setIlerleyen] = React.useState<string | null>(null);
  // Üretim geçmişi sheet'i — emir id (içerik props'tan türetilir ki
  // ilerletme sonrası tazelenen veriyle güncellensin).
  const [gecmisId, setGecmisId] = React.useState<string | null>(null);
  // İlerletme onayı: not opsiyonel, boş bırakılabilir.
  const [ilerletId, setIlerletId] = React.useState<string | null>(null);
  const [not, setNot] = React.useState("");
  // Rota dışı hedef istasyon (boş = sıradaki adım).
  const [hedef, setHedef] = React.useState<string | null>(null);

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "uretim-hatti",
    yol: "/uretim/fabrika",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

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

  async function ilerlet(
    e: FabrikaEmri,
    aciklama?: string,
    hedefIstasyon?: string,
  ) {
    setIlerleyen(e.id);
    const res = await emriIlerlet(e.id, aciklama, hedefIstasyon);
    setIlerleyen(null);
    setIlerletId(null);
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

  const gecmisEmir = emirler.find((e) => e.id === gecmisId) ?? null;
  const ilerletEmir = emirler.find((e) => e.id === ilerletId) ?? null;
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
          <ListHeader title="Üretim Hattı">
            <KolonAyarButonu kolon={kolon} />
          </ListHeader>
          <Table>
            <TableHeader>
              <TableRow>
                {kolon.temelGorunur("id") && (
                  <SiralaFiltreBaslik
                    sira={sira("id")}
                    onSirala={sirala("id")}
                    filtre={{ tip: "metin", deger: metin, onDeger: setMetin }}
                  >
                    Emir No
                  </SiralaFiltreBaslik>
                )}
                {kolon.temelGorunur("model") && (
                  <SiralaFiltreBaslik
                    sira={sira("model")}
                    onSirala={sirala("model")}
                  >
                    Model / Parça
                  </SiralaFiltreBaslik>
                )}
                {kolon.temelGorunur("adet") && (
                  <SiralaFiltreBaslik
                    className="text-right"
                    sira={sira("adet")}
                    onSirala={sirala("adet")}
                  >
                    Adet
                  </SiralaFiltreBaslik>
                )}
                {kolon.temelGorunur("oncelik") && <TableHead>Öncelik</TableHead>}
                {kolon.temelGorunur("istasyon") && (
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
                )}
                {kolon.temelGorunur("ilerleme") && (
                  <TableHead className="w-44">İlerleme</TableHead>
                )}
                {kolon.temelGorunur("durum") && (
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
                )}
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtreli.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={kolon.gorunurTemelSayisi + 1}
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
                          onSecim: () => {
                            setNot("");
                            setHedef(null);
                            setIlerletId(e.id);
                          },
                        },
                        {
                          etiket: "Üretim Geçmişi",
                          ikon: History,
                          onSecim: () => setGecmisId(e.id),
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
                        {kolon.temelGorunur("id") && (
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {e.id}
                          </TableCell>
                        )}
                        {kolon.temelGorunur("model") && (
                          <TableCell className="text-sm font-medium">
                            {e.modelAd}
                          </TableCell>
                        )}
                        {kolon.temelGorunur("adet") && (
                          <TableCell className="text-right text-sm tabular-nums">
                            {e.adet}
                          </TableCell>
                        )}
                        {kolon.temelGorunur("oncelik") && (
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
                        )}
                        {kolon.temelGorunur("istasyon") && (
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
                        )}
                        {kolon.temelGorunur("ilerleme") && (
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
                        )}
                        {kolon.temelGorunur("durum") && (
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
                        )}
                        <TableCell>
                          {ilerletilebilir && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={ilerleyen === e.id}
                              onClick={() => {
                                setNot("");
                                setHedef(null);
                                setIlerletId(e.id);
                              }}
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

      {/* ── İlerletme onayı (opsiyonel not) ── */}
      {ilerletEmir && (
        <IlerletDialog
          emir={ilerletEmir}
          istasyonMap={istasyonMap}
          not={not}
          onNot={setNot}
          hedef={hedef}
          onHedef={setHedef}
          istasyonlar={istasyonlar}
          mesgul={ilerleyen === ilerletEmir.id}
          onKapat={() => setIlerletId(null)}
          onOnay={() => ilerlet(ilerletEmir, not, hedef ?? undefined)}
        />
      )}

      {/* ── Üretim geçmişi sheet'i ── */}
      <FormSheet
        open={gecmisId !== null}
        onOpenChange={(o) => !o && setGecmisId(null)}
        title={
          gecmisEmir ? `${gecmisEmir.id} · Üretim Geçmişi` : "Üretim Geçmişi"
        }
        sheetClassName="data-[side=right]:sm:max-w-lg"
        footer={<div className="border-t p-2" />}
      >
        {gecmisEmir && (
          <UretimGecmisi emir={gecmisEmir} istasyonMap={istasyonMap} />
        )}
      </FormSheet>

      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />

      {onayDialog}
    </div>
  );
}

/** Süreyi okunur yazar: "2 sa 14 dk", "45 sn". */
function msMetni(ms: number): string {
  const sn = Math.round(ms / 1000);
  if (sn < 60) return `${sn} sn`;
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

/** İki zaman damgası arası süre; biri yoksa null. */
function sureMetni(bas?: string, bit?: string): string | null {
  if (!bas || !bit) return null;
  const ms = new Date(bit).getTime() - new Date(bas).getTime();
  return ms < 0 ? null : msMetni(ms);
}

const saatMetni = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

/** Emrin istasyon istasyon üretim geçmişi — zaman çizelgesi. */
function UretimGecmisi({
  emir,
  istasyonMap,
}: {
  emir: FabrikaEmri;
  istasyonMap: Map<string, Istasyon>;
}) {
  const tamam = emir.adimlar.filter((a) => a.durum === "Tamamlandı");
  const ilkBas = emir.adimlar.find((a) => a.baslangic)?.baslangic;
  const sonBit = [...emir.adimlar].reverse().find((a) => a.bitis)?.bitis;
  const toplamSure = sureMetni(ilkBas, sonBit);
  // En uzun süren adım — darboğaz.
  let darbogaz: { ad: string; ms: number } | null = null;
  for (const a of emir.adimlar) {
    if (!a.baslangic || !a.bitis) continue;
    const ms = new Date(a.bitis).getTime() - new Date(a.baslangic).getTime();
    const ad = istasyonMap.get(a.istasyon)?.ad ?? a.istasyon;
    if (!darbogaz || ms > darbogaz.ms) darbogaz = { ad, ms };
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Özet */}
      <div className="grid grid-cols-3 divide-x rounded-md border bg-muted/30 py-2">
        <GecmisMetrik
          etiket="Adım"
          deger={`${tamam.length}/${emir.adimlar.length}`}
        />
        <GecmisMetrik etiket="Toplam Süre" deger={toplamSure ?? "—"} />
        <GecmisMetrik
          etiket="En Uzun"
          deger={darbogaz ? darbogaz.ad : "—"}
          alt={darbogaz ? msMetni(darbogaz.ms) : undefined}
        />
      </div>

      {/* Zaman çizelgesi */}
      <div className="flex flex-col">
        {emir.adimlar.map((a, i) => {
          const ist = istasyonMap.get(a.istasyon);
          const bitti = a.durum === "Tamamlandı";
          const isleniyor = a.durum === "İşleniyor";
          const atlandi = a.durum === "Atlandı";
          const sure = sureMetni(a.baslangic, a.bitis);
          const son = i === emir.adimlar.length - 1;
          return (
            <div key={a.sira} className="flex gap-3">
              {/* Nokta + bağlantı çizgisi */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-card",
                    bitti
                      ? "bg-emerald-500"
                      : isleniyor
                        ? "bg-amber-500"
                        : atlandi
                          ? "bg-slate-400"
                          : "bg-muted-foreground/30",
                  )}
                />
                {!son && (
                  <span
                    className={cn(
                      "w-px flex-1",
                      bitti ? "bg-emerald-500/40" : "bg-border",
                    )}
                  />
                )}
              </div>

              <div className={cn("min-w-0 flex-1", son ? "pb-0" : "pb-4")}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {ist && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: ist.renk }}
                      />
                    )}
                    {ist?.ad ?? a.istasyon}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      bitti
                        ? "bg-emerald-100 text-emerald-800"
                        : isleniyor
                          ? "bg-amber-100 text-amber-800"
                          : atlandi
                            ? "bg-slate-200 text-slate-700"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {a.durum}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  {a.baslangic ? (
                    <span>Başladı: {saatMetni(a.baslangic)}</span>
                  ) : (
                    <span>Henüz başlamadı</span>
                  )}
                  {a.bitis && <span>Bitti: {saatMetni(a.bitis)}</span>}
                  {sure && (
                    <span className="font-medium text-foreground">{sure}</span>
                  )}
                </div>
                {a.not && (
                  <p className="mt-1 rounded-md border bg-muted/30 px-2 py-1 text-xs whitespace-pre-wrap">
                    {a.not}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GecmisMetrik({
  etiket,
  deger,
  alt,
}: {
  etiket: string;
  deger: string;
  alt?: string;
}) {
  return (
    <div className="min-w-0 px-3 text-center">
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {etiket}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{deger}</div>
      {alt && (
        <div className="truncate text-[11px] text-muted-foreground">{alt}</div>
      )}
    </div>
  );
}
