"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  ImageIcon,
  Layers,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  aktifIstasyon,
  type FabrikaEmri,
  type Istasyon,
  type IstasyonSlug,
} from "@/lib/fabrika";
import { emriIlerlet } from "@/lib/db/actions";

// three yalnızca tarayıcıda yüklenir.
const FabrikaSahne = dynamic(() => import("./fabrika-sahne"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Fabrika yükleniyor…
    </div>
  ),
});

/** Ürün görseli kutusu — yoksa nötr yer tutucu. */
function UrunGorsel({
  src,
  ad,
  boyut = 40,
}: {
  src?: string;
  ad: string;
  boyut?: number;
}) {
  if (!src)
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground"
        style={{ width: boyut, height: boyut }}
      >
        <ImageIcon className="size-4" />
      </span>
    );
  return (
    <Image
      src={src}
      alt={ad}
      width={boyut}
      height={boyut}
      unoptimized
      className="shrink-0 rounded-md border object-cover"
      style={{ width: boyut, height: boyut }}
    />
  );
}

/** Sol panel satırı: üretimdeki emir — görsel, ilerleme ve alt parçalar. */
function UretimSatiri({
  e,
  istasyonMap,
  secili,
  onSec,
}: {
  e: FabrikaEmri;
  istasyonMap: Map<IstasyonSlug, Istasyon>;
  secili: boolean;
  onSec: () => void;
}) {
  const [acik, setAcik] = React.useState(false);
  const aktifSlug = aktifIstasyon(e);
  const aktifIst = aktifSlug ? istasyonMap.get(aktifSlug) : undefined;
  const tamam = e.adimlar.filter((a) => a.durum === "Tamamlandı").length;
  const oran = e.adimlar.length ? tamam / e.adimlar.length : 0;
  const parcalar = e.parcalar ?? [];

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        secili ? "border-primary/40 bg-primary/5" : "bg-card hover:bg-[#fafafa]",
      )}
    >
      <button
        type="button"
        onClick={onSec}
        className="flex w-full cursor-pointer items-center gap-2.5 p-2 text-left"
      >
        <UrunGorsel src={e.gorsel} ad={e.modelAd} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate text-sm font-medium">{e.modelAd}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              ×{e.adet}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {aktifIst && (
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: aktifIst.renk }}
              />
            )}
            <span className="truncate text-xs text-muted-foreground">
              {aktifIst?.ad ?? e.durum}
            </span>
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {tamam}/{e.adimlar.length}
            </span>
          </span>
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary/70"
              style={{ width: `${Math.round(oran * 100)}%` }}
            />
          </span>
        </span>
      </button>

      {/* Model üretiminde alt parçalar — tıklayınca altında listelenir */}
      {parcalar.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setAcik((a) => !a)}
            className="flex w-full cursor-pointer items-center gap-1 border-t px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                acik && "rotate-90",
              )}
            />
            <Layers className="size-3" />
            {parcalar.length} parça
          </button>
          {acik && (
            <div className="flex flex-col gap-1 border-t bg-muted/20 p-2">
              {parcalar.map((p) => (
                <div key={p.parcaId} className="flex items-center gap-2">
                  <UrunGorsel src={p.gorsel} ad={p.ad} boyut={26} />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {p.ad}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {(p.miktar * e.adet).toLocaleString("tr-TR")} ad
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmirKarti({
e,
rota,
istasyonMap,
seciliEmirId,
onSec,
ilerleyen,
onIlerlet,
}: {
e: FabrikaEmri;
rota: IstasyonSlug[];
istasyonMap: Map<IstasyonSlug, Istasyon>;
seciliEmirId: string | null;
onSec: (id: string) => void;
ilerleyen: string | null;
onIlerlet: (id: string) => void;
}) {
  const aktifSlug = aktifIstasyon(e);
  const aktifAdimNo = e.adimlar.find((a) => a.durum === "İşleniyor")?.sira;
  const tamamlanan = e.adimlar.filter((a) => a.durum === "Tamamlandı").length;
  const sonAdimda = aktifSlug === rota[rota.length - 1];
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-card p-3",
        seciliEmirId === e.id && "ring-1 ring-foreground/20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSec(e.id)}
          className="cursor-pointer truncate text-sm font-medium hover:underline"
        >
          {e.id}
        </button>
        {e.oncelik && e.oncelik !== "Normal" && (
          <Badge variant="secondary" className="shrink-0">
            {e.oncelik}
          </Badge>
        )}
      </div>
      <p className="truncate text-sm text-muted-foreground">
        {e.modelAd} × {e.adet}
      </p>
      {/* Rota ilerleme çubukları */}
      <div className="flex items-center gap-1">
        {e.adimlar.map((a) => (
          <span
            key={a.sira}
            title={`${istasyonMap.get(a.istasyon)?.ad} — ${a.durum}`}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              a.durum === "Tamamlandı"
                ? "bg-emerald-500"
                : a.durum === "İşleniyor"
                  ? "bg-amber-400"
                  : "bg-[#e5e5e5]",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {aktifAdimNo
            ? `${tamamlanan + 1}/${e.adimlar.length} · ${istasyonMap.get(aktifSlug!)?.ad}`
            : e.adimlar.length > 0
              ? "Başlamadı"
              : "Rota yok"}
        </span>
        <Button
          size="sm"
          variant={sonAdimda ? "default" : "outline"}
          disabled={ilerleyen === e.id || e.adimlar.length === 0}
          onClick={() => onIlerlet(e.id)}
        >
          {ilerleyen === e.id ? (
            "…"
          ) : aktifAdimNo ? (
            <>
              {sonAdimda ? "Tamamla" : "İlerlet"}
              <ArrowRight className="size-3.5" />
            </>
          ) : (
            "Başlat"
          )}
        </Button>
      </div>
    </div>
  );
}

export function FabrikaGorunum({
  emirler,
  istasyonlar,
}: {
  emirler: FabrikaEmri[];
  istasyonlar: Istasyon[];
}) {
  const router = useRouter();
  // Rota/harita DB istasyonlarından türetilir (eski sabitlerin yerine).
  const ISTASYONLAR = istasyonlar;
  const ISTASYON_MAP = React.useMemo(
    () => new Map(istasyonlar.map((i) => [i.slug, i])),
    [istasyonlar],
  );
  const ROTA = React.useMemo(
    () => istasyonlar.map((i) => i.slug),
    [istasyonlar],
  );
  const [seciliIstasyon, setSeciliIstasyon] =
    React.useState<IstasyonSlug | null>(null);
  const [seciliEmirId, setSeciliEmirId] = React.useState<string | null>(null);
  const [ilerleyen, setIlerleyen] = React.useState<string | null>(null);

  // Sahne verisi periyodik tazelenir (LAN için yeterli).
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const aktifler = emirler.filter((e) => e.durum !== "Tamamlandı");
  const seciliEmir = aktifler.find((e) => e.id === seciliEmirId) ?? null;
  const istasyonEmirleri = seciliIstasyon
    ? aktifler.filter((e) => aktifIstasyon(e) === seciliIstasyon)
    : [];

  async function ilerlet(emirId: string) {
    setIlerleyen(emirId);
    const res = await emriIlerlet(emirId);
    setIlerleyen(null);
    if (!res.ok) {
      toast.error(res.error ?? "İlerletilemedi.", {
        description: res.eksikler
          ?.map(
            (e) =>
              `${e.ad}: gereken ${e.gereken.toFixed(1)} ${e.birim}, eldeki ${e.eldeki.toFixed(1)}`,
          )
          .join(" · "),
      });
      return;
    }
    if (res.eksikler?.length) {
      toast.warning("Emir ilerledi — stok negatife düştü", {
        description: res.eksikler
          .map(
            (e) =>
              `${e.ad}: gereken ${e.gereken.toFixed(1)} ${e.birim}, eldeki ${e.eldeki.toFixed(1)}`,
          )
          .join(" · "),
      });
    } else {
      toast.success("Emir ilerletildi");
    }
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 xl:flex-row">
      {/* SOL: üretimdekiler */}
      <div className="flex w-full shrink-0 flex-col gap-2 xl:w-72">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="size-4 text-muted-foreground" />
            Üretimde
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {aktifler.length}
            </span>
          </h2>
          {seciliEmirId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSeciliEmirId(null)}
            >
              Seçimi bırak
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-1.5 overflow-y-auto xl:max-h-[calc(100dvh-12rem)]">
          {aktifler.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Üretimde emir yok.
            </p>
          ) : (
            aktifler.map((e) => (
              <UretimSatiri
                key={e.id}
                e={e}
                istasyonMap={ISTASYON_MAP}
                secili={seciliEmirId === e.id}
                onSec={() => {
                  const yeni = seciliEmirId === e.id ? null : e.id;
                  setSeciliEmirId(yeni);
                  // Emir seçilince sahne o emrin akışını gösterir.
                  if (yeni) setSeciliIstasyon(null);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* ORTA: sahne */}
      <div className="relative min-h-[420px] min-w-0 flex-1 overflow-hidden rounded-md border bg-[#fafafa]">
        <FabrikaSahne
          emirler={aktifler}
          istasyonlar={istasyonlar}
          seciliIstasyon={seciliIstasyon}
          seciliEmirId={seciliEmirId}
          akisEmri={seciliEmir}
          onIstasyonSec={setSeciliIstasyon}
          onEmirSec={setSeciliEmirId}
        />
        {/* Sol üst özet çipleri */}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
          {ISTASYONLAR.map((i) => {
            const sayi = aktifler.filter(
              (e) => aktifIstasyon(e) === i.slug,
            ).length;
            if (sayi === 0) return null;
            return (
              <span
                key={i.slug}
                className="flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.08)] backdrop-blur-sm"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: i.renk }}
                />
                {i.ad}
                <span className="tabular-nums">{sayi}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* SAĞ: seçilen istasyon / emir */}
      <div className="flex w-full shrink-0 flex-col gap-3 xl:w-80">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Boxes className="size-4 text-muted-foreground" />
            {seciliIstasyon
              ? ISTASYON_MAP.get(seciliIstasyon)?.ad
              : "Fabrika Durumu"}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Yenile"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>

        {seciliIstasyon ? (
          <div className="flex flex-col gap-2 overflow-y-auto">
            {istasyonEmirleri.length === 0 && (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Bu istasyonda emir yok.
              </p>
            )}
            {istasyonEmirleri.map((e) => (
              <EmirKarti
                key={e.id}
                e={e}
                rota={ROTA}
                istasyonMap={ISTASYON_MAP}
                seciliEmirId={seciliEmirId}
                onSec={setSeciliEmirId}
                ilerleyen={ilerleyen}
                onIlerlet={ilerlet}
              />
            ))}
          </div>
        ) : seciliEmir ? (
          <EmirKarti
            e={seciliEmir}
            rota={ROTA}
            istasyonMap={ISTASYON_MAP}
            seciliEmirId={seciliEmirId}
            onSec={setSeciliEmirId}
            ilerleyen={ilerleyen}
            onIlerlet={ilerlet}
          />
        ) : (
          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {ISTASYONLAR.map((i) => {
              const grup = aktifler.filter((e) => aktifIstasyon(e) === i.slug);
              return (
                <button
                  key={i.slug}
                  type="button"
                  onClick={() => setSeciliIstasyon(i.slug)}
                  className="flex cursor-pointer items-center justify-between rounded-md border bg-card px-3 py-2.5 text-left transition-colors hover:bg-[#fafafa]"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: i.renk }}
                    />
                    {i.ad}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {grup.length > 0 ? `${grup.length} emir` : "—"}
                  </span>
                </button>
              );
            })}
            <p className="mt-1 px-1 text-xs text-muted-foreground">
              Bölüme veya palete tıklayarak detayına inebilirsin; sahne 30
              sn&apos;de bir tazelenir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
