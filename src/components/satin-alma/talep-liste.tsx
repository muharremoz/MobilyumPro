"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  ChevronDown,
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
  talepTedarikEt,
  talepSil,
} from "@/lib/db/actions";

const DURUM_RENK: Record<TalepDurum, string> = {
  Beklemede: "bg-amber-100 text-amber-800",
  Onaylandı: "bg-blue-100 text-blue-800",
  Reddedildi: "bg-rose-100 text-rose-800",
  "Tedarik Sürecinde": "bg-violet-100 text-violet-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
};

const SATIR_DURUM_RENK: Record<TalepSatirDurum, string> = {
  Bekliyor: "bg-slate-100 text-slate-700",
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
  // Kalem detayı açık talepler.
  const [aciklar, setAciklar] = React.useState<Set<string>>(new Set());
  const [mesgul, setMesgul] = React.useState<string | null>(null);

  // Dialoglar id ile açılır; içerik props'tan türetilir ki router.refresh
  // sonrası güncel veri görünsün.
  const [redId, setRedId] = React.useState<string | null>(null);
  const [redNeden, setRedNeden] = React.useState("");
  const [tedarikHedef, setTedarikHedef] = React.useState<{
    talepId: string;
    satirId: number;
  } | null>(null);

  const redTalep = talepler.find((t) => t.id === redId) ?? null;
  const tedarikTalep =
    talepler.find((t) => t.id === tedarikHedef?.talepId) ?? null;
  const tedarikSatir =
    tedarikTalep?.satirlar.find((s) => s.id === tedarikHedef?.satirId) ?? null;

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

  function detayToggle(id: string) {
    setAciklar((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // ── Aksiyonlar ────────────────────────────────────────────────────────
  async function onaylaAksiyon(t: SatinAlmaTalep) {
    if (
      !(await onayla({
        title: `${t.id} onaylansın mı?`,
        description:
          "Onaylanan talebi Satın Alma departmanı tedarik sürecine alabilir.",
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
    setAciklar((s) => new Set(s).add(t.id)); // satırlar açılsın — mal kabul burada
    router.refresh();
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

  return (
    <div className="flex flex-col gap-3">
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
              <TableHead className="text-right">Tedarik</TableHead>
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
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Talep yok. Üretim Planı&apos;nda eksik malzemeleri seçip
                  &quot;Satın Alma Talebi Oluştur&quot; ile başlayın.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((t) => {
                const acik = aciklar.has(t.id);
                const tedarikte =
                  t.durum === "Tedarik Sürecinde" || t.durum === "Tamamlandı";
                const oran = tedarikOrani(t);
                return (
                  <React.Fragment key={t.id}>
                    <ContextMenu>
                      <ContextMenuTrigger render={<TableRow />}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {t.id}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTarih(t.tarih)}
                        </TableCell>
                        <TableCell className="text-sm">{t.kaynak}</TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => detayToggle(t.id)}
                            aria-expanded={acik}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          >
                            {tedarikte ? (
                              <>
                                <span className="tabular-nums">
                                  {tamamSatir(t)}/{t.satirlar.length} kalem
                                </span>
                                <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                                  <span
                                    className={cn(
                                      "block h-full rounded-full",
                                      oran >= 1
                                        ? "bg-emerald-500"
                                        : "bg-violet-500",
                                    )}
                                    style={{
                                      width: `${Math.round(oran * 100)}%`,
                                    }}
                                  />
                                </span>
                              </>
                            ) : (
                              <span>{t.satirlar.length} kalem</span>
                            )}
                            <ChevronDown
                              className={cn(
                                "size-3 transition-transform",
                                acik && "rotate-180",
                              )}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {formatTL(t.tahminiTutar)}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className={DURUM_RENK[t.durum]}
                            >
                              {t.durum}
                            </Badge>
                            {t.alisId && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/satin-alma/${t.alisId}`)
                                }
                                className="cursor-pointer font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                              >
                                {t.alisId}
                              </button>
                            )}
                          </span>
                        </TableCell>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-56">
                        {t.durum === "Beklemede" && yonetici && (
                          <>
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
                        {t.alisId && (
                          <ContextMenuItem
                            onClick={() =>
                              router.push(`/satin-alma/${t.alisId}`)
                            }
                          >
                            <Receipt className="mr-2 size-4" /> Alış Fişini Gör
                          </ContextMenuItem>
                        )}
                        {(t.durum === "Beklemede" ||
                          t.durum === "Reddedildi") && (
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
                    {acik && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={6} className="p-0">
                          <div className="flex flex-col gap-1.5 px-10 py-2.5">
                            {t.satirlar.map((s) => {
                              const kalan = Math.max(
                                0,
                                s.miktar - s.tedarikEdilen,
                              );
                              return (
                                <div
                                  key={s.id}
                                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                                >
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {s.malzemeId}
                                  </span>
                                  <span className="font-medium">
                                    {s.malzemeAd}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "px-1.5 py-0 text-[11px]",
                                      SATIR_DURUM_RENK[s.durum],
                                    )}
                                  >
                                    {s.durum}
                                  </Badge>
                                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                    {s.tedarikEdilen.toLocaleString("tr-TR", {
                                      maximumFractionDigits: 2,
                                    })}
                                    {" / "}
                                    {s.miktar.toLocaleString("tr-TR", {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    {s.birim}
                                    {kalan > 0 && (
                                      <span className="text-amber-700">
                                        {" "}
                                        · kalan{" "}
                                        {kalan.toLocaleString("tr-TR", {
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                    )}
                                  </span>
                                  {t.durum === "Tedarik Sürecinde" &&
                                    satinAlmaci &&
                                    kalan > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7"
                                        onClick={() =>
                                          setTedarikHedef({
                                            talepId: t.id,
                                            satirId: s.id,
                                          })
                                        }
                                      >
                                        <PackageCheck className="size-3.5" />{" "}
                                        Tedarik Et
                                      </Button>
                                    )}
                                </div>
                              );
                            })}

                            {/* Audit izi + açıklama */}
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              {t.olusturanAd && (
                                <span>Oluşturan: {t.olusturanAd}</span>
                              )}
                              {t.onaylayanAd && (
                                <span>
                                  {t.durum === "Reddedildi"
                                    ? "Reddeden"
                                    : "Onaylayan"}
                                  : {t.onaylayanAd}
                                  {t.onayTarihi &&
                                    ` (${formatTarih(t.onayTarihi)})`}
                                </span>
                              )}
                              {t.baslatanAd && (
                                <span>
                                  Başlatan: {t.baslatanAd}
                                  {t.baslatmaTarihi &&
                                    ` (${formatTarih(t.baslatmaTarihi)})`}
                                </span>
                              )}
                              {t.depo && <span>Hedef depo: {t.depo}</span>}
                              {t.redNedeni && (
                                <span className="text-rose-600">
                                  Red nedeni: {t.redNedeni}
                                </span>
                              )}
                            </div>
                            {t.aciklama && (
                              <p className="text-xs text-muted-foreground">
                                {t.aciklama}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} talep
      </span>

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

      {/* ── Mal kabul dialogu ── */}
      {tedarikTalep && tedarikSatir && (
        <TedarikDialog
          talep={tedarikTalep}
          satir={tedarikSatir}
          tedarikciler={tedarikciler}
          depolar={depolar}
          kullaniciId={mevcutKullanici.id}
          onKapat={() => setTedarikHedef(null)}
          onKaydedildi={() => {
            setTedarikHedef(null);
            router.refresh();
          }}
        />
      )}

      {onayDialog}
    </div>
  );
}

/** Tek satır için mal kabul — miktar (kısmi olabilir) + firma + fiyat + depo. */
function TedarikDialog({
  talep,
  satir,
  tedarikciler,
  depolar,
  kullaniciId,
  onKapat,
  onKaydedildi,
}: {
  talep: SatinAlmaTalep;
  satir: TalepSatiri;
  tedarikciler: { id: string; ad: string }[];
  depolar: string[];
  kullaniciId: string;
  onKapat: () => void;
  onKaydedildi: () => void;
}) {
  const kalan = Math.max(0, satir.miktar - satir.tedarikEdilen);
  const [miktar, setMiktar] = React.useState(String(kalan));
  const [cariAd, setCariAd] = React.useState<string | null>(
    satir.cariAd ?? null,
  );
  const [fiyat, setFiyat] = React.useState(String(satir.tahminiFiyat));
  const [depo, setDepo] = React.useState<string | null>(
    talep.depo && depolar.includes(talep.depo)
      ? talep.depo
      : (depolar[0] ?? null),
  );
  const [fiyatGuncelle, setFiyatGuncelle] = React.useState(true);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const cari = tedarikciler.find((t) => t.ad === cariAd);
  const m = Number(miktar);
  const f = Number(fiyat);
  const gecerli = cari && depo && m > 0 && m <= kalan + 1e-9 && f >= 0;

  async function kaydet() {
    if (!gecerli || !cari || !depo) return;
    setKaydediliyor(true);
    const res = await talepTedarikEt({
      talepId: talep.id,
      satirId: satir.id,
      miktar: m,
      cariId: cari.id,
      cariAd: cari.ad,
      birimFiyat: f,
      depo,
      fiyatGuncelle,
      kullaniciId,
    });
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Mal kabul kaydedilemedi.");
      return;
    }
    toast.success(
      `${satir.malzemeAd} — ${m.toLocaleString("tr-TR")} ${satir.birim} stoğa girdi (${res.alisId})`,
    );
    if (res.tamamlandi)
      toast.success(`${talep.id} tamamlandı — tüm malzemeler tedarik edildi`, {
        duration: 6000,
      });
    onKaydedildi();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mal Kabul — {satir.malzemeAd}</DialogTitle>
          <DialogDescription>
            İstenen {satir.miktar.toLocaleString("tr-TR")} {satir.birim} ·
            tedarik edilen {satir.tedarikEdilen.toLocaleString("tr-TR")}{" "}
            {satir.birim} · kalan{" "}
            <span className="font-medium text-foreground">
              {kalan.toLocaleString("tr-TR")} {satir.birim}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Miktar ({satir.birim})
            </span>
            <Input
              type="number"
              min={0}
              step="any"
              value={miktar}
              onChange={(e) => setMiktar(e.target.value)}
              className={cn(
                "tabular-nums",
                !(m > 0 && m <= kalan + 1e-9) && "ring-1 ring-rose-300",
              )}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Birim Fiyat (₺)
            </span>
            <Input
              type="number"
              min={0}
              step="any"
              value={fiyat}
              onChange={(e) => setFiyat(e.target.value)}
              className="tabular-nums"
            />
          </label>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Tedarikçi
            </span>
            <SearchSelect
              items={tedarikciler.map((t) => t.ad)}
              value={cariAd}
              onValueChange={setCariAd}
              placeholder="Firma seç"
              emptyText="Tedarikçi yok"
              className={cn(!cari && "ring-1 ring-rose-300")}
            />
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Depo
            </span>
            <SearchSelect
              items={depolar}
              value={depo}
              onValueChange={setDepo}
              placeholder="Depo seç"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={fiyatGuncelle}
            onCheckedChange={(v) => setFiyatGuncelle(v === true)}
          />
          Birim fiyatı malzemeye yaz (son alış)
        </label>

        <p className="text-xs text-muted-foreground">
          Kaydedilince stok girişi, stok hareketi ve tedarikçiye cari borç
          otomatik oluşur. Kısmi teslimat için kalanın altında miktar
          girebilirsiniz.
        </p>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onKapat}>
            Vazgeç
          </Button>
          <Button size="sm" disabled={!gecerli || kaydediliyor} onClick={kaydet}>
            <PackageCheck className="size-3.5" />
            {kaydediliyor ? "Kaydediliyor..." : "Stoğa Al"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
