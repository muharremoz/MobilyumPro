"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  X,
  ReceiptText,
  PackagePlus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { KartBaslik } from "@/components/ui/kart-baslik";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTL, type Doviz, type Malzeme } from "@/lib/data";
import { alisKaydet, depoKaydet } from "@/lib/db/actions";

const DOVIZ_SEMBOL: Record<Doviz, string> = { TL: "₺", USD: "$", EUR: "€" };
function paraFmt(n: number, d: Doviz | undefined): string {
  // TL veya bilinmeyen/boş → ₺ biçimi.
  if (d !== "USD" && d !== "EUR") return formatTL(n);
  return `${DOVIZ_SEMBOL[d]}${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Yeni alış formu — fiş bilgileri kartı + hızlı malzeme ekleme + zengin
 * satırlar (mevcut stok / son alış fiyatı) + sağda özet.
 * Kaydet tek transaction'da stok girişi + stok hareketi + cari Alacak işler.
 */
type Satir = {
  malzemeId: string;
  /** Bu satırın alındığı tedarikçi (satır bazında firma). */
  cariId: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  /** Birim fiyatın dövizi. */
  doviz: Doviz;
  /** Malzemenin son (kayıtlı) alış fiyatı — karşılaştırma için. */
  sonFiyat: number;
  /** Malzemenin mevcut stoğu — bilgi. */
  mevcutStok: number;
};

const bugun = () => new Date().toISOString().slice(0, 10);

function Alan({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function AlisForm({
  tedarikciler,
  malzemeler,
  depolar,
  sonFiyatlar = [],
}: {
  tedarikciler: { id: string; ad: string }[];
  malzemeler: Malzeme[];
  depolar: string[];
  /** (malzeme, cari) → o tedarikçiden son alınan birim fiyat + tarih. */
  sonFiyatlar?: {
    malzemeId: string;
    cariId: string;
    fiyat: number;
    tarih: string;
  }[];
}) {
  const router = useRouter();

  const [tarih, setTarih] = React.useState(bugun);
  const [depoListe, setDepoListe] = React.useState(depolar);
  const [depo, setDepo] = React.useState(depolar[0] ?? "");
  const [yeniDepoAcik, setYeniDepoAcik] = React.useState(false);
  const [yeniDepoAd, setYeniDepoAd] = React.useState("");
  const [belgeNo, setBelgeNo] = React.useState("");
  const [aciklama, setAciklama] = React.useState("");
  const [satirlar, setSatirlar] = React.useState<Satir[]>([]);
  const [fiyatGuncelle, setFiyatGuncelle] = React.useState(true);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  // Hızlı ekleme etiketi: "Ad · birim · stok X · ₺fiyat".
  const araEtiket = (m: Malzeme) =>
    `${m.ad} · ${m.birim} · stok ${m.stok} · ${formatTL(m.birimFiyat)}`;
  const etiketMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [araEtiket(m), m])),
    [malzemeler],
  );
  const cariMap = React.useMemo(
    () => new Map(tedarikciler.map((t) => [t.id, t])),
    [tedarikciler],
  );
  const cariAdMap = React.useMemo(
    () => new Map(tedarikciler.map((t) => [t.ad, t])),
    [tedarikciler],
  );
  // (malzeme, cari) → son alış kaydı (fiyat + tarih).
  const sonFiyatMap = React.useMemo(
    () =>
      new Map(
        sonFiyatlar.map((s) => [
          `${s.malzemeId}:${s.cariId}`,
          { fiyat: s.fiyat, tarih: s.tarih },
        ]),
      ),
    [sonFiyatlar],
  );
  /** Firmaya göre son alış fiyatı; yoksa malzemenin genel fiyatı. */
  const firmaSonFiyat = React.useCallback(
    (malzemeId: string, cariId: string, genel: number) =>
      (cariId && sonFiyatMap.get(`${malzemeId}:${cariId}`)?.fiyat) || genel,
    [sonFiyatMap],
  );
  /** Firmadan son alış kaydı (fiyat + tarih) — hovercard için. */
  const firmaSonKayit = (malzemeId: string, cariId: string) =>
    cariId ? sonFiyatMap.get(`${malzemeId}:${cariId}`) : undefined;

  // ── Özet ──────────────────────────────────────────────────────────────
  const gecerli = satirlar.filter((s) => s.malzemeId && s.miktar > 0);
  const satirTutari = (s: Satir) => s.miktar * s.birimFiyat;
  const toplam = gecerli.reduce((t, s) => t + satirTutari(s), 0);
  const toplamMiktar = gecerli.reduce((t, s) => t + s.miktar, 0);
  const eksikFirma = gecerli.some((s) => !s.cariId);
  // Tedarikçi bazında özet
  const firmaOzeti = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of gecerli) {
      if (!s.cariId) continue;
      m.set(s.cariId, (m.get(s.cariId) ?? 0) + satirTutari(s));
    }
    return [...m.entries()].map(([id, tutar]) => ({
      ad: cariMap.get(id)?.ad ?? id,
      tutar,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satirlar, cariMap]);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function malzemeEkle(m: Malzeme) {
    // Varsayılan firma: malzemenin üretici carisi (varsa ve tedarikçilerde).
    const varsayilan =
      m.tedarikci && cariMap.has(m.tedarikci) ? m.tedarikci : "";
    const fiyat = firmaSonFiyat(m.id, varsayilan, m.birimFiyat);
    setSatirlar((s) => [
      ...s,
      {
        malzemeId: m.id,
        cariId: varsayilan,
        miktar: 1,
        birim: m.birim,
        birimFiyat: fiyat,
        doviz: m.doviz || "TL",
        sonFiyat: fiyat,
        mevcutStok: m.stok,
      },
    ]);
  }

  async function depoEkle() {
    const ad = yeniDepoAd.trim();
    if (!ad) {
      toast.error("Depo adı gerekli");
      return;
    }
    const res = await depoKaydet({
      id: "",
      ad,
      sehir: "",
      kapasite: 0,
      doluluk: 0,
      durum: "Aktif",
    });
    if (!res.ok) {
      toast.error("Depo eklenemedi.");
      return;
    }
    setDepoListe((l) => (l.includes(ad) ? l : [...l, ad]));
    setDepo(ad);
    setYeniDepoAcik(false);
    setYeniDepoAd("");
    toast.success("Depo eklendi");
  }

  /** Satır firması değişince o firmadan son fiyatı uygula. */
  function firmaSec(i: number, cariId: string) {
    setSatirlar((prev) => {
      const n = [...prev];
      const s = n[i];
      const m = malzemeMap.get(s.malzemeId);
      const genel = m?.birimFiyat ?? s.sonFiyat;
      const fiyat = firmaSonFiyat(s.malzemeId, cariId, genel);
      n[i] = { ...s, cariId, sonFiyat: fiyat, birimFiyat: fiyat };
      return n;
    });
  }
  function satirGuncelle(i: number, degisim: Partial<Satir>) {
    setSatirlar((s) => {
      const n = [...s];
      n[i] = { ...n[i], ...degisim };
      return n;
    });
  }

  async function kaydet() {
    if (gecerli.length === 0) {
      toast.error("En az bir malzeme satırı gerekli");
      return;
    }
    if (eksikFirma) {
      toast.error("Her satır için tedarikçi seçin");
      return;
    }
    setKaydediliyor(true);
    const res = await alisKaydet({
      tarih,
      depo,
      belgeNo: belgeNo.trim() || undefined,
      aciklama: aciklama.trim() || undefined,
      satirlar: gecerli.map((s) => ({
        malzemeId: s.malzemeId,
        malzemeAd: malzemeMap.get(s.malzemeId)?.ad ?? s.malzemeId,
        cariId: s.cariId,
        cariAd: cariMap.get(s.cariId)?.ad ?? "",
        miktar: s.miktar,
        birim: s.birim,
        birimFiyat: s.birimFiyat,
      })),
      fiyatGuncelle,
    });
    setKaydediliyor(false);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Alış kaydedilemedi.");
      return;
    }
    toast.success(
      `Alış kaydedildi (${res.id}) — stok girişi ve cari işlemi oluşturuldu`,
    );
    router.push("/satin-alma");
  }

  const aktifMalzemeler = malzemeler.filter((m) => m.durum === "Aktif");

  return (
    <div className="flex flex-col gap-3">
      {/* Üst şerit — geri + Kaydet */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/satin-alma" aria-label="Satın almalara dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">Yeni Alış</span>
        <Button
          className="ml-auto"
          onClick={kaydet}
          disabled={gecerli.length === 0 || eksikFirma || kaydediliyor}
        >
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        {/* ── Sol: fiş bilgileri + satırlar ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Fiş bilgileri */}
          <div className="rounded-md border bg-card">
            <KartBaslik ikon={ReceiptText} baslik="Fiş Bilgileri" />
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
              <Alan label="Tarih">
                <Input
                  type="date"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                />
              </Alan>
              <Alan label="Depo">
                <SearchSelect
                  items={depoListe}
                  value={depo || null}
                  onValueChange={(v) => setDepo(v ?? "")}
                  placeholder="Depo"
                  addLabel="Yeni depo ekle"
                  onAdd={() => {
                    setYeniDepoAd("");
                    setYeniDepoAcik(true);
                  }}
                />
              </Alan>
              <Alan label="Belge No">
                <Input
                  placeholder="Fatura/irsaliye (ops.)"
                  value={belgeNo}
                  onChange={(e) => setBelgeNo(e.target.value)}
                />
              </Alan>
            </div>
          </div>

          {/* Satırlar */}
          <div className="overflow-hidden rounded-md border bg-card">
            <KartBaslik
              ikon={PackagePlus}
              baslik="Malzemeler"
              sag={
                <span className="text-xs text-muted-foreground">
                  {gecerli.length} kalem
                </span>
              }
            />
            {/* Hızlı ekleme */}
            <div className="border-b bg-muted/30 p-2.5">
              <SearchSelect
                items={aktifMalzemeler.map(araEtiket)}
                value={null}
                onValueChange={(secim) => {
                  const m = secim ? etiketMap.get(secim) : undefined;
                  if (m) malzemeEkle(m);
                }}
                placeholder="Malzeme ara ve ekle…"
                emptyText="Malzeme bulunamadı"
              />
            </div>

            {satirlar.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Yukarıdaki kutudan malzeme aratıp ekleyin.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_170px_84px_96px_84px_110px_36px] items-center gap-2 border-b bg-muted/20 px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <span>Malzeme</span>
                  <span>Firma</span>
                  <span>Miktar</span>
                  <span>Birim Fiyat</span>
                  <span>Döviz</span>
                  <span className="text-right">Tutar</span>
                  <span />
                </div>
                <div className="divide-y">
                  {satirlar.map((s, i) => {
                    const m = malzemeMap.get(s.malzemeId);
                    const fark = s.birimFiyat - s.sonFiyat;
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_170px_84px_96px_84px_110px_36px] items-center gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <HoverCard>
                            <HoverCardTrigger
                              delay={0}
                              closeDelay={0}
                              render={
                                <div className="w-fit max-w-full cursor-default truncate text-sm font-medium">
                                  {m?.ad ?? s.malzemeId}
                                </div>
                              }
                            />
                            <HoverCardContent align="start" className="w-64">
                              {(() => {
                                const kayit = firmaSonKayit(
                                  s.malzemeId,
                                  s.cariId,
                                );
                                const firmaAd = cariMap.get(s.cariId)?.ad;
                                return (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="text-sm font-medium">
                                      {m?.ad ?? s.malzemeId}
                                    </div>
                                    <div className="flex flex-col gap-1 text-xs">
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Stok
                                        </span>
                                        <span className="tabular-nums">
                                          {s.mevcutStok} {s.birim}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Firma
                                        </span>
                                        <span className="truncate">
                                          {firmaAd ?? "—"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Son alış
                                        </span>
                                        <span className="tabular-nums">
                                          {paraFmt(
                                            kayit ? kayit.fiyat : s.sonFiyat,
                                            s.doviz,
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Tarih
                                        </span>
                                        <span className="tabular-nums">
                                          {kayit?.tarih ?? "kayıt yok"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        {/* Firma (ayrı sütun) */}
                        <SearchSelect
                          items={tedarikciler.map((t) => t.ad)}
                          value={cariMap.get(s.cariId)?.ad ?? null}
                          onValueChange={(ad) =>
                            firmaSec(i, ad ? (cariAdMap.get(ad)?.id ?? "") : "")
                          }
                          placeholder="Firma seç"
                          emptyText="Tedarikçi yok"
                          className={cn(
                            "h-8",
                            !s.cariId && "ring-1 ring-rose-300 ring-offset-0",
                          )}
                        />
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={s.miktar}
                            onChange={(e) =>
                              satirGuncelle(i, {
                                miktar: Number(e.target.value),
                              })
                            }
                            className="h-8 pr-11 tabular-nums"
                          />
                          {s.birim && (
                            <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {s.birim}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={s.birimFiyat}
                            onChange={(e) =>
                              satirGuncelle(i, {
                                birimFiyat: Number(e.target.value),
                              })
                            }
                            className="h-8 pr-5 tabular-nums"
                          />
                          {Math.abs(fark) > 0.005 && (
                            <span
                              className={cn(
                                "absolute top-1/2 right-1.5 -translate-y-1/2",
                                fark > 0 ? "text-rose-500" : "text-emerald-600",
                              )}
                              title={`Son alışa göre ${fark > 0 ? "pahalı" : "ucuz"}: ${paraFmt(Math.abs(fark), s.doviz)}`}
                            >
                              {fark > 0 ? (
                                <TrendingUp className="size-3.5" />
                              ) : (
                                <TrendingDown className="size-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                        <SearchSelect
                          items={["TL", "USD", "EUR"]}
                          value={s.doviz}
                          onValueChange={(v) =>
                            satirGuncelle(i, { doviz: (v as Doviz) || "TL" })
                          }
                          className="h-8 px-2"
                        />
                        <span className="text-right text-sm font-medium tabular-nums">
                          {paraFmt(satirTutari(s), s.doviz)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Satırı kaldır"
                          onClick={() =>
                            setSatirlar((x) => x.filter((_, j) => j !== i))
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Sağ: özet ── */}
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-80">
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Alış Özeti
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {formatTL(toplam)}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kalem sayısı</span>
                <span className="tabular-nums">{gecerli.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toplam miktar</span>
                <span className="tabular-nums">{toplamMiktar}</span>
              </div>
            </div>

            {firmaOzeti.length > 0 && (
              <div className="mt-3 rounded-md border bg-muted/30 p-2.5">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Tedarikçiler ({firmaOzeti.length})
                </p>
                <div className="mt-1.5 flex flex-col gap-1 text-xs">
                  {firmaOzeti.map((f) => (
                    <div
                      key={f.ad}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0 truncate">{f.ad}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatTL(f.tutar)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {eksikFirma && (
              <p className="mt-2 text-xs text-rose-600">
                Bazı satırlarda firma seçilmedi.
              </p>
            )}

            <div className="my-3 h-px bg-border" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setFiyatGuncelle((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFiyatGuncelle((v) => !v);
                }
              }}
              className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  Birim fiyatları güncelle
                </span>
                <span className="text-xs text-muted-foreground">
                  Satır fiyatı malzemenin birim fiyatına yazılır (son alış).
                </span>
              </span>
              <Switch
                checked={fiyatGuncelle}
                className="pointer-events-none mt-0.5 shrink-0 data-checked:bg-emerald-600"
              />
            </div>
            <div className="mt-3">
              <Textarea
                placeholder="Açıklama (opsiyonel)"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Yeni depo modalı */}
      <Dialog open={yeniDepoAcik} onOpenChange={setYeniDepoAcik}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Yeni Depo</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Depo adı"
            value={yeniDepoAd}
            onChange={(e) => setYeniDepoAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                depoEkle();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setYeniDepoAcik(false)}>
              İptal
            </Button>
            <Button onClick={depoEkle} disabled={!yeniDepoAd.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
