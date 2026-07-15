"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  ExternalLink,
  PackageCheck,
  Play,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ListHeader } from "@/components/ui/list-header";
import { SearchSelect } from "@/components/ui/search-select";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { useOnay } from "@/components/ui/confirm-dialog";
import { FormSheet } from "@/components/ui/form-sheet";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTL,
  formatTarih,
  type SatinAlmaTalep,
  type TalepSatiri,
  type TalepDurum,
  type TalepSatirDurum,
} from "@/lib/data";
import {
  talepOnayla,
  talepReddet,
  talepBaslat,
  talepSiparisEkle,
  talepSil,
} from "@/lib/db/actions";
import { paraDegeri, paraMaskele, paraMetni } from "@/lib/para";

const DURUM_RENK: Record<TalepDurum, string> = {
  Beklemede: "bg-amber-100 text-amber-800",
  Onaylandı: "bg-blue-100 text-blue-800",
  Reddedildi: "bg-rose-100 text-rose-800",
  "Tedarik Sürecinde": "bg-violet-100 text-violet-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
};

const SATIR_DURUM_RENK: Record<TalepSatirDurum, string> = {
  Bekliyor: "bg-slate-100 text-slate-700",
  "Sipariş Verildi": "bg-blue-100 text-blue-800",
  Kısmi: "bg-amber-100 text-amber-800",
  "Tedarik Edildi": "bg-emerald-100 text-emerald-800",
};

const DURUMLAR: TalepDurum[] = [
  "Beklemede",
  "Onaylandı",
  "Reddedildi",
  "Tedarik Sürecinde",
  "Tamamlandı",
];

function DurumBadge({ durum }: { durum: TalepDurum }) {
  return (
    <Badge variant="secondary" className={DURUM_RENK[durum]}>
      {durum}
    </Badge>
  );
}

/** Tam tedarik edilen satır sayısı. */
const tamamSatir = (t: SatinAlmaTalep) =>
  t.satirlar.filter((s) => s.durum === "Tedarik Edildi").length;

/** Miktar ağırlıklı tedarik oranı (0–1) — kısmi teslimatlar da sayılır. */
function tedarikOrani(t: SatinAlmaTalep) {
  if (t.satirlar.length === 0) return 0;
  const oran = t.satirlar.reduce(
    (top, s) =>
      top + Math.min(1, s.miktar > 0 ? s.tedarikEdilen / s.miktar : 0),
    0,
  );
  return oran / t.satirlar.length;
}

type SortKey = "id" | "tarih" | "kaynak" | "tutar" | "durum";

export function TalepListe({
  talepler,
  tedarikciler,
  depolar,
  mevcutKullanici,
}: {
  talepler: SatinAlmaTalep[];
  tedarikciler: { id: string; ad: string }[];
  /** Aktif depo adları (mal kabul hedefi). */
  depolar: string[];
  /** TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı. */
  mevcutKullanici: { id: string; ad: string; rol: string; departman?: string };
}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();

  const yonetici = mevcutKullanici.rol === "Yönetici";
  const satinAlmaci =
    yonetici ||
    (mevcutKullanici.departman ?? "")
      .toLocaleLowerCase("tr")
      .includes("satın alma");

  const [noFiltre, setNoFiltre] = React.useState("");
  const [kaynak, setKaynak] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "desc" },
  );
  const [mesgul, setMesgul] = React.useState<string | null>(null);

  // Dialoglar id ile açılır; içerik props'tan türetilir ki router.refresh
  // sonrası güncel veri görünsün (örn. Başlat sonrası Tedarik Et butonları).
  const [detayId, setDetayId] = React.useState<string | null>(null);
  const [redId, setRedId] = React.useState<string | null>(null);
  const [redNeden, setRedNeden] = React.useState("");
  const [siparisHedef, setSiparisHedef] = React.useState<{
    talepId: string;
    satirId: number;
  } | null>(null);
  // Malzeme Durumu satırına tıklayınca açılan detay sheet'i (malzeme id).
  const [malzemeDetayId, setMalzemeDetayId] = React.useState<string | null>(
    null,
  );

  const detay = talepler.find((t) => t.id === detayId) ?? null;
  const redTalep = talepler.find((t) => t.id === redId) ?? null;
  const siparisTalep =
    talepler.find((t) => t.id === siparisHedef?.talepId) ?? null;
  const siparisSatir =
    siparisTalep?.satirlar.find((s) => s.id === siparisHedef?.satirId) ?? null;

  const kaynaklar = React.useMemo(
    () => [...new Set(talepler.map((t) => t.kaynak))],
    [talepler],
  );

  const filtreli = React.useMemo(() => {
    const q = noFiltre.toLowerCase();
    const arr = talepler.filter(
      (t) =>
        t.id.toLowerCase().includes(q) &&
        (kaynak === "Tümü" || t.kaynak === kaynak) &&
        (durum === "Tümü" || t.durum === durum),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "tutar") return (a.tahminiTutar - b.tahminiTutar) * yon;
      return String(a[sort.key]).localeCompare(String(b[sort.key]), "tr") * yon;
    });
  }, [talepler, noFiltre, kaynak, durum, sort]);

  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  // ── Durum panosu: sekmeler ──────────────────────────────────────────────
  const [tab, setTab] = React.useState<"talepler" | "malzeme">(
    "talepler",
  );
  // Panoda reddedilenler hariç aktif talepler.
  const aktifTalepler = React.useMemo(
    () => talepler.filter((t) => t.durum !== "Reddedildi"),
    [talepler],
  );

  // Malzeme bazlı durum — tüm aktif talepler toplanır.
  const malzemeDurum = React.useMemo(() => {
    const m = new Map<
      string,
      {
        malzemeAd: string;
        birim: string;
        istenen: number;
        siparis: number;
        tedarik: number;
      }
    >();
    for (const t of aktifTalepler) {
      for (const s of t.satirlar) {
        const g =
          m.get(s.malzemeId) ??
          {
            malzemeAd: s.malzemeAd,
            birim: s.birim,
            istenen: 0,
            siparis: 0,
            tedarik: 0,
          };
        g.istenen += s.miktar;
        g.siparis += s.siparisler.reduce((n, o) => n + o.miktar, 0);
        g.tedarik += s.tedarikEdilen;
        m.set(s.malzemeId, g);
      }
    }
    return [...m.entries()]
      .map(([id, g]) => ({
        malzemeId: id,
        ...g,
        bekleyen: Math.max(0, g.istenen - g.tedarik),
      }))
      .sort((a, b) => b.bekleyen - a.bekleyen);
  }, [aktifTalepler]);

  // ── Aksiyonlar ────────────────────────────────────────────────────────
  async function onaylaAksiyon(t: SatinAlmaTalep) {
    if (
      !(await onayla({
        title: `${t.id} onaylansın mı?`,
        description:
          "Onaylanan talebi Satın Alma departmanı tedarik sürecine alabilir.",
        confirmLabel: "Onayla",
        destructive: false,
      }))
    )
      return;
    setMesgul(t.id);
    const res = await talepOnayla(t.id, mevcutKullanici.id);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Talep onaylanamadı.");
      return;
    }
    toast.success(`${t.id} onaylandı`);
    router.refresh();
  }

  async function reddetAksiyon() {
    if (!redTalep) return;
    setMesgul(redTalep.id);
    const res = await talepReddet(redTalep.id, mevcutKullanici.id, redNeden);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Talep reddedilemedi.");
      return;
    }
    toast.success(`${redTalep.id} reddedildi`);
    setRedId(null);
    setRedNeden("");
    router.refresh();
  }

  async function baslatAksiyon(t: SatinAlmaTalep) {
    setMesgul(t.id);
    const res = await talepBaslat(t.id, mevcutKullanici.id);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Talep başlatılamadı.");
      return;
    }
    toast.success(`${t.id} tedarik sürecine alındı`);
    setDetayId(t.id); // mal kabul detay modalında yapılır
    router.refresh();
  }

  /** Fatura gir: talebin siparişleri tek firmaysa o firmayla alış aç,
   *  birden fazla firma varsa Bekleyen Siparişler'e (firma bazlı giriş) yönlendir. */
  function faturaGir(t: SatinAlmaTalep) {
    const firmalar = [
      ...new Set(
        t.satirlar.flatMap((s) =>
          s.siparisler
            .filter((o) => o.tedarikEdilen < o.miktar - 1e-9)
            .map((o) => o.cariId),
        ),
      ),
    ];
    if (firmalar.length === 1)
      router.push(`/satin-alma/yeni?siparisFirma=${firmalar[0]}`);
    else router.push("/satin-alma/siparisler");
  }

  async function sil(id: string) {
    setMesgul(id);
    const res = await talepSil(id);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Talep silindi");
    router.refresh();
  }

  const sekmeler: { key: typeof tab; etiket: string }[] = [
    { key: "talepler", etiket: "Model Durumu" },
    { key: "malzeme", etiket: "Malzeme Durumu" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Sekmeler */}
      <div className="flex gap-1 border-b">
        {sekmeler.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className={cn(
              "-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === s.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {tab === "malzeme" && (
        <div className="overflow-hidden rounded-md border bg-card">
          <ListHeader title="Malzeme Durumu" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Malzeme</TableHead>
                <TableHead className="text-right">İstenen</TableHead>
                <TableHead className="text-right">Sipariş Verilen</TableHead>
                <TableHead className="text-right">Tedarik Edilen</TableHead>
                <TableHead className="text-right">Bekleyen</TableHead>
                <TableHead className="w-32">İlerleme</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {malzemeDurum.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aktif talep yok.
                  </TableCell>
                </TableRow>
              ) : (
                malzemeDurum.map((d) => {
                  const oran =
                    d.istenen > 0 ? Math.min(1, d.tedarik / d.istenen) : 0;
                  return (
                    <TableRow
                      key={d.malzemeId}
                      className="cursor-pointer"
                      onClick={() => setMalzemeDetayId(d.malzemeId)}
                    >
                      <TableCell className="font-medium">
                        {d.malzemeAd}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.istenen.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-blue-700">
                        {d.siparis.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">
                        {d.tedarik.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          d.bekleyen > 0
                            ? "font-medium text-amber-700"
                            : "text-muted-foreground",
                        )}
                      >
                        {d.bekleyen.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                oran >= 1 ? "bg-emerald-500" : "bg-violet-500",
                              )}
                              style={{ width: `${Math.round(oran * 100)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[11px] text-muted-foreground tabular-nums">
                            %{Math.round(oran * 100)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "talepler" && (
      <>
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Satın Alma Talepleri" />
        <Table>
          <TableHeader>
            <TableRow>
              <SiralaFiltreBaslik
                sira={sira("id")}
                onSirala={sirala("id")}
                filtre={{ tip: "metin", deger: noFiltre, onDeger: setNoFiltre }}
              >
                Talep No
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik sira={sira("tarih")} onSirala={sirala("tarih")}>
                Tarih
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("kaynak")}
                onSirala={sirala("kaynak")}
                filtre={{
                  tip: "liste",
                  secenekler: kaynaklar,
                  deger: kaynak,
                  onDeger: setKaynak,
                }}
              >
                Kaynak
              </SiralaFiltreBaslik>
              <TableHead>Model</TableHead>
              <TableHead>Oluşturan</TableHead>
              <TableHead>Tedarik</TableHead>
              <SiralaFiltreBaslik
                className="text-right"
                sira={sira("tutar")}
                onSirala={sirala("tutar")}
              >
                Tahmini Tutar
              </SiralaFiltreBaslik>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Talep yok. Üretim Planı&apos;nda eksik malzemeleri seçip
                  &quot;Satın Alma Talebi Oluştur&quot; ile başlayın.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((t) => (
                <ContextMenu key={t.id}>
                  <ContextMenuTrigger
                    render={
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setDetayId(t.id)}
                      />
                    }
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.id}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTarih(t.tarih)}
                    </TableCell>
                    <TableCell className="text-sm">{t.kaynak}</TableCell>
                    <TableCell className="max-w-48">
                      {t.modeller ? (
                        <span
                          title={t.modeller}
                          className="block truncate text-sm font-medium"
                        >
                          {t.modeller}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.olusturanAd ?? "—"}
                    </TableCell>
                    <TableCell>
                      <TedarikIlerleme talep={t} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatTL(t.tahminiTutar)}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <DurumBadge durum={t.durum} />
                        {t.alisId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/satin-alma/${t.alisId}`);
                            }}
                            className="cursor-pointer font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                          >
                            {t.alisId}
                          </button>
                        )}
                      </span>
                    </TableCell>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuItem onClick={() => setDetayId(t.id)}>
                      <ExternalLink className="mr-2 size-4" /> Detay
                    </ContextMenuItem>
                    {t.durum === "Beklemede" && yonetici && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          disabled={mesgul === t.id}
                          onClick={() => onaylaAksiyon(t)}
                        >
                          <Check className="mr-2 size-4" /> Onayla
                        </ContextMenuItem>
                        <ContextMenuItem
                          disabled={mesgul === t.id}
                          onClick={() => {
                            setRedNeden("");
                            setRedId(t.id);
                          }}
                        >
                          <Ban className="mr-2 size-4" /> Reddet
                        </ContextMenuItem>
                      </>
                    )}
                    {t.durum === "Onaylandı" && satinAlmaci && (
                      <ContextMenuItem
                        disabled={mesgul === t.id}
                        onClick={() => baslatAksiyon(t)}
                      >
                        <Play className="mr-2 size-4" /> Tedarike Başla
                      </ContextMenuItem>
                    )}
                    {t.durum === "Tedarik Sürecinde" &&
                      satinAlmaci &&
                      t.satirlar.some(
                        (s) =>
                          s.durum === "Sipariş Verildi" || s.durum === "Kısmi",
                      ) && (
                        <ContextMenuItem
                          onClick={() =>
                            faturaGir(t)
                          }
                        >
                          <Receipt className="mr-2 size-4" /> Fatura Gir
                        </ContextMenuItem>
                      )}
                    {t.alisId && (
                      <ContextMenuItem
                        onClick={() => router.push(`/satin-alma/${t.alisId}`)}
                      >
                        <Receipt className="mr-2 size-4" /> Alış Fişini Gör
                      </ContextMenuItem>
                    )}
                    {(t.durum === "Beklemede" || t.durum === "Reddedildi") && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          variant="destructive"
                          disabled={mesgul === t.id}
                          onClick={() => sil(t.id)}
                        >
                          <Trash2 className="mr-2 size-4" /> Sil
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} talep
      </span>
      </>
      )}

      {/* ── Detay sheet'i ── */}
      <FormSheet
        open={detay !== null}
        onOpenChange={(o) => !o && setDetayId(null)}
        title={detay ? `${detay.id} · Satın Alma Talebi` : ""}
        sheetClassName="data-[side=right]:w-auto data-[side=right]:min-w-[24rem] data-[side=right]:sm:max-w-[min(72rem,calc(100vw-1rem))]"
        contentClassName="flex flex-col gap-3"
        footer={
          detay && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4">
              <span className="text-sm text-muted-foreground tabular-nums">
                {tamamSatir(detay)}/{detay.satirlar.length} malzeme tedarik
                edildi · tahmini {formatTL(detay.tahminiTutar)}
              </span>
              <div className="flex items-center gap-2">
                {detay.durum === "Beklemede" && yonetici && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mesgul === detay.id}
                      onClick={() => {
                        setRedNeden("");
                        setRedId(detay.id);
                      }}
                    >
                      <Ban className="size-3.5" /> Reddet
                    </Button>
                    <Button
                      size="sm"
                      disabled={mesgul === detay.id}
                      onClick={() => onaylaAksiyon(detay)}
                    >
                      <Check className="size-3.5" /> Onayla
                    </Button>
                  </>
                )}
                {detay.durum === "Onaylandı" && satinAlmaci && (
                  <Button
                    size="sm"
                    disabled={mesgul === detay.id}
                    onClick={() => baslatAksiyon(detay)}
                  >
                    <Play className="size-3.5" /> Tedarike Başla
                  </Button>
                )}
                {detay.durum === "Tedarik Sürecinde" &&
                  satinAlmaci &&
                  detay.satirlar.some(
                    (s) =>
                      s.durum === "Sipariş Verildi" || s.durum === "Kısmi",
                  ) && (
                    <Button
                      size="sm"
                      onClick={() =>
                        faturaGir(detay)
                      }
                    >
                      <Receipt className="size-3.5" /> Fatura Gir
                    </Button>
                  )}
              </div>
            </div>
          )
        }
      >
          {detay && (
            <>
              {/* Üst meta satırı */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <DurumBadge durum={detay.durum} />
                <span>
                  {detay.kaynak} · {formatTarih(detay.tarih)}
                  {detay.olusturanAd && <> · {detay.olusturanAd}</>}
                </span>
              </div>
              {detay.modeller && (
                <p className="px-0.5 text-sm font-medium">{detay.modeller}</p>
              )}

              {/* Audit izi */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
                {detay.olusturanAd && (
                  <span>
                    Oluşturan:{" "}
                    <span className="text-foreground">{detay.olusturanAd}</span>
                  </span>
                )}
                {detay.onaylayanAd && (
                  <span>
                    {detay.durum === "Reddedildi" ? "Reddeden" : "Onaylayan"}:{" "}
                    <span className="text-foreground">{detay.onaylayanAd}</span>
                    {detay.onayTarihi && <> ({formatTarih(detay.onayTarihi)})</>}
                  </span>
                )}
                {detay.baslatanAd && (
                  <span>
                    Başlatan:{" "}
                    <span className="text-foreground">{detay.baslatanAd}</span>
                    {detay.baslatmaTarihi && (
                      <> ({formatTarih(detay.baslatmaTarihi)})</>
                    )}
                  </span>
                )}
                {detay.depo && (
                  <span>
                    Hedef depo:{" "}
                    <span className="text-foreground">{detay.depo}</span>
                  </span>
                )}
                {detay.alisId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/satin-alma/${detay.alisId}`)}
                    className="cursor-pointer font-mono underline-offset-2 hover:underline"
                  >
                    Alış: {detay.alisId}
                  </button>
                )}
                {detay.redNedeni && (
                  <span className="text-rose-600">
                    Red nedeni: {detay.redNedeni}
                  </span>
                )}
              </div>

              {/* Malzeme listesi — uzunsa kendi içinde kayar (yapışkan başlık) */}
              <div className="max-h-[55dvh] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Malzeme</TableHead>
                      <TableHead className="text-right">İstenen</TableHead>
                      <TableHead>Sipariş</TableHead>
                      <TableHead className="text-right">Tedarik</TableHead>
                      <TableHead className="text-right">Kalan</TableHead>
                      <TableHead>Durum</TableHead>
                      {detay.durum === "Tedarik Sürecinde" && satinAlmaci && (
                        <TableHead className="w-28" />
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detay.satirlar.map((s) => {
                      const kalan = Math.max(0, s.miktar - s.tedarikEdilen);
                      // Henüz sipariş verilmemiş kalan (yeni sipariş için).
                      const siparilen = s.siparisler.reduce(
                        (n, o) => n + o.miktar,
                        0,
                      );
                      const siparisKalan = Math.max(0, s.miktar - siparilen);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.malzemeAd}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.miktar.toLocaleString("tr-TR", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {s.birim}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.siparisler.length > 0 ? (
                              <div className="flex flex-col gap-0.5 leading-tight">
                                {s.siparisler.map((o) => (
                                  <span
                                    key={o.id}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="font-medium">
                                      {o.cariAd}
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">
                                      {o.miktar.toLocaleString("tr-TR", {
                                        maximumFractionDigits: 2,
                                      })}{" "}
                                      {s.birim}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {s.tedarikEdilen.toLocaleString("tr-TR", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {s.birim}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              kalan > 0
                                ? "font-medium text-amber-700"
                                : "text-muted-foreground",
                            )}
                          >
                            {kalan.toLocaleString("tr-TR", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {s.birim}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={SATIR_DURUM_RENK[s.durum]}
                            >
                              {s.durum}
                            </Badge>
                          </TableCell>
                          {detay.durum === "Tedarik Sürecinde" &&
                            satinAlmaci && (
                              <TableCell>
                                {siparisKalan > 0.0005 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setSiparisHedef({
                                        talepId: detay.id,
                                        satirId: s.id,
                                      })
                                    }
                                  >
                                    <PackageCheck className="size-3.5" /> Sipariş
                                    Ver
                                  </Button>
                                )}
                              </TableCell>
                            )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {detay.aciklama && (
                <p className="px-1 text-xs text-muted-foreground">
                  {detay.aciklama}
                </p>
              )}
            </>
          )}
      </FormSheet>

      {/* ── Red dialogu ── */}
      <Dialog open={redTalep !== null} onOpenChange={(o) => !o && setRedId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Talebi reddet</DialogTitle>
            <DialogDescription>
              {redTalep?.id} reddedilecek. İsterseniz bir neden yazın.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            placeholder="Red nedeni (opsiyonel)"
            value={redNeden}
            onChange={(e) => setRedNeden(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setRedId(null)}>
              Vazgeç
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={mesgul !== null}
              onClick={reddetAksiyon}
            >
              <Ban className="size-3.5" /> Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sipariş verme dialogu ── */}
      {siparisTalep && siparisSatir && (
        <SiparisDialog
          talep={siparisTalep}
          satir={siparisSatir}
          tedarikciler={tedarikciler}
          kullaniciId={mevcutKullanici.id}
          onKapat={() => setSiparisHedef(null)}
          onKaydedildi={() => {
            setSiparisHedef(null);
            router.refresh();
          }}
        />
      )}

      {/* ── Malzeme durum detay sheet'i ── */}
      <FormSheet
        open={malzemeDetayId !== null}
        onOpenChange={(o) => !o && setMalzemeDetayId(null)}
        title={
          malzemeDetayId
            ? (aktifTalepler
                .flatMap((t) => t.satirlar)
                .find((s) => s.malzemeId === malzemeDetayId)?.malzemeAd ??
              malzemeDetayId)
            : ""
        }
        sheetClassName="data-[side=right]:sm:max-w-2xl"
        contentClassName="flex flex-col gap-4"
        footer={<div className="border-t p-2" />}
      >
        {malzemeDetayId &&
          (() => {
            // Bu malzemeyi içeren talepler + o taleplerdeki ilgili satır(lar).
            const kayitlar = aktifTalepler
              .map((t) => ({
                talep: t,
                satirlar: t.satirlar.filter(
                  (s) => s.malzemeId === malzemeDetayId,
                ),
              }))
              .filter((x) => x.satirlar.length > 0);
            const toplamIstenen = kayitlar
              .flatMap((x) => x.satirlar)
              .reduce((n, s) => n + s.miktar, 0);
            const toplamTedarik = kayitlar
              .flatMap((x) => x.satirlar)
              .reduce((n, s) => n + s.tedarikEdilen, 0);
            return (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {kayitlar.length} talepte geçiyor · toplam istenen{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {toplamIstenen.toLocaleString("tr-TR", {
                      maximumFractionDigits: 2,
                    })}
                  </span>{" "}
                  · tedarik edilen{" "}
                  <span className="font-medium text-emerald-700 tabular-nums">
                    {toplamTedarik.toLocaleString("tr-TR", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Talep</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">İstenen</TableHead>
                        <TableHead>Sipariş Firması</TableHead>
                        <TableHead className="text-right">Tedarik</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kayitlar.flatMap((x) =>
                        x.satirlar.map((s) => (
                          <TableRow key={`${x.talep.id}-${s.id}`}>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => {
                                  setMalzemeDetayId(null);
                                  setDetayId(x.talep.id);
                                }}
                                className="cursor-pointer font-mono text-xs font-medium underline-offset-2 hover:underline"
                              >
                                {x.talep.id}
                              </button>
                            </TableCell>
                            <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                              {x.talep.modeller?.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {s.miktar.toLocaleString("tr-TR", {
                                maximumFractionDigits: 2,
                              })}{" "}
                              {s.birim}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.siparisler.length > 0 ? (
                                s.siparisler.map((o) => o.cariAd).join(", ")
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {s.tedarikEdilen.toLocaleString("tr-TR", {
                                maximumFractionDigits: 2,
                              })}{" "}
                              {s.birim}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={SATIR_DURUM_RENK[s.durum]}
                              >
                                {s.durum}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
      </FormSheet>

      {onayDialog}
    </div>
  );
}

/** Liste kolonundaki tedarik ilerlemesi: "5/10 kalem" + mini bar. */
function TedarikIlerleme({ talep }: { talep: SatinAlmaTalep }) {
  const tedarikte =
    talep.durum === "Tedarik Sürecinde" || talep.durum === "Tamamlandı";
  if (!tedarikte)
    return (
      <span className="text-sm text-muted-foreground">
        {talep.durum === "Reddedildi" ? "—" : `${talep.satirlar.length} kalem`}
      </span>
    );
  const oran = tedarikOrani(talep);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm tabular-nums">
        {tamamSatir(talep)}/{talep.satirlar.length} kalem
      </span>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            oran >= 1 ? "bg-emerald-500" : "bg-violet-500",
          )}
          style={{ width: `${Math.round(oran * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Tek satır için SİPARİŞ VER — bir firmaya sipariş ekler (kalan sipariş kadar).
 *  Farklı firmalara bölmek için tekrar tekrar sipariş verilebilir. Stok etkilenmez. */
function SiparisDialog({
  talep,
  satir,
  tedarikciler,
  kullaniciId,
  onKapat,
  onKaydedildi,
}: {
  talep: SatinAlmaTalep;
  satir: TalepSatiri;
  tedarikciler: { id: string; ad: string }[];
  kullaniciId: string;
  onKapat: () => void;
  onKaydedildi: () => void;
}) {
  const siparilen = satir.siparisler.reduce((n, o) => n + o.miktar, 0);
  const kalanSiparis = Math.max(0, satir.miktar - siparilen);
  const [miktar, setMiktar] = React.useState(String(kalanSiparis));
  // Öneri firma: henüz sipariş verilmemiş üretici cari → yoksa boş.
  const seciliCariIds = new Set(satir.siparisler.map((o) => o.cariId));
  const [cariAd, setCariAd] = React.useState<string | null>(() => {
    const uretici = tedarikciler.find((t) => t.id === satir.ureticiCariId);
    return uretici && !seciliCariIds.has(uretici.id) ? uretici.ad : null;
  });
  const [fiyat, setFiyat] = React.useState(paraMetni(satir.tahminiFiyat));
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const cari = tedarikciler.find((t) => t.ad === cariAd);
  const m = Number(miktar);
  const gecerli = cari && m > 0 && m <= kalanSiparis + 1e-9;

  async function kaydet() {
    if (!gecerli || !cari) return;
    setKaydediliyor(true);
    const res = await talepSiparisEkle({
      talepId: talep.id,
      satirId: satir.id,
      cariId: cari.id,
      cariAd: cari.ad,
      miktar: m,
      fiyat: paraDegeri(fiyat) || undefined,
      kullaniciId,
    });
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Sipariş verilemedi.");
      return;
    }
    toast.success(`${satir.malzemeAd} — ${cari.ad} firmasına sipariş verildi`);
    onKaydedildi();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sipariş Ver — {satir.malzemeAd}</DialogTitle>
          <DialogDescription>
            İstenen {satir.miktar.toLocaleString("tr-TR")} {satir.birim} ·
            sipariş verilen {siparilen.toLocaleString("tr-TR")} {satir.birim} ·
            kalan{" "}
            <span className="font-medium text-foreground">
              {kalanSiparis.toLocaleString("tr-TR")} {satir.birim}
            </span>
          </DialogDescription>
        </DialogHeader>

        {satir.siparisler.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            <p className="mb-1 font-medium text-muted-foreground">
              Mevcut siparişler
            </p>
            <div className="flex flex-col gap-0.5">
              {satir.siparisler.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{o.cariAd}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {o.miktar.toLocaleString("tr-TR")} {satir.birim}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3">
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Tedarikçi
            </span>
            <SearchSelect
              items={tedarikciler
                .filter((t) => !seciliCariIds.has(t.id) || t.ad === cariAd)
                .map((t) => t.ad)}
              value={cariAd}
              onValueChange={setCariAd}
              placeholder="Firma seç"
              emptyText="Tedarikçi yok"
              className={cn(!cari && "ring-1 ring-rose-300")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Sipariş Miktarı ({satir.birim})
              </span>
              <Input
                type="number"
                min={0}
                step="any"
                value={miktar}
                onChange={(e) => setMiktar(e.target.value)}
                className={cn(
                  "tabular-nums",
                  !(m > 0 && m <= kalanSiparis + 1e-9) && "ring-1 ring-rose-300",
                )}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Birim Fiyat (₺)
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={fiyat}
                onChange={(e) => setFiyat(paraMaskele(e.target.value))}
                className="tabular-nums"
              />
            </label>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Sipariş stok ve cariyi etkilemez. Farklı firmalara bölmek için tekrar
          sipariş verebilirsiniz. Bu firmadan fatura girilince otomatik
          &quot;Tedarik Edildi&quot; olur.
        </p>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onKapat}>
            Vazgeç
          </Button>
          <Button size="sm" disabled={!gecerli || kaydediliyor} onClick={kaydet}>
            <PackageCheck className="size-3.5" />
            {kaydediliyor ? "Kaydediliyor..." : "Sipariş Ver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
