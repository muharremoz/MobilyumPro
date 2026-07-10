"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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

  function EmirKarti({ e }: { e: FabrikaEmri }) {
    const aktifSlug = aktifIstasyon(e);
    const aktifAdimNo = e.adimlar.find((a) => a.durum === "İşleniyor")?.sira;
    const tamamlanan = e.adimlar.filter((a) => a.durum === "Tamamlandı").length;
    const sonAdimda = aktifSlug === ROTA[ROTA.length - 1];
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
            onClick={() => setSeciliEmirId(e.id)}
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
              title={`${ISTASYON_MAP.get(a.istasyon)?.ad} — ${a.durum}`}
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
              ? `${tamamlanan + 1}/${e.adimlar.length} · ${ISTASYON_MAP.get(aktifSlug!)?.ad}`
              : e.adimlar.length > 0
                ? "Başlamadı"
                : "Rota yok"}
          </span>
          <Button
            size="sm"
            variant={sonAdimda ? "default" : "outline"}
            disabled={ilerleyen === e.id || e.adimlar.length === 0}
            onClick={() => ilerlet(e.id)}
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 xl:flex-row">
      {/* Sahne */}
      <div className="relative min-h-[420px] min-w-0 flex-1 overflow-hidden rounded-md border bg-[#fafafa]">
        <FabrikaSahne
          emirler={aktifler}
          istasyonlar={istasyonlar}
          seciliIstasyon={seciliIstasyon}
          seciliEmirId={seciliEmirId}
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

      {/* Sağ panel */}
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
              <EmirKarti key={e.id} e={e} />
            ))}
          </div>
        ) : seciliEmir ? (
          <EmirKarti e={seciliEmir} />
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
              sn'de bir tazelenir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
