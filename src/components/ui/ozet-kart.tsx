import * as React from "react";

import { cn } from "@/lib/utils";
import { BaslikDokusu } from "@/components/ui/baslik-dokusu";

/**
 * PROJE STANDARDI — özet (metrik) kartı.
 *
 * Liste ve form kartlarıyla aynı iskelet: üstte renkli başlık şeridi +
 * altıgen doku, altta değer. Daha önce her sayfa kendi MetricCard'ını
 * yazıyordu (stok durumu ve stok takip'te iki ayrı kopya vardı) ve ikisi de
 * shadcn Card primitive'iyle kurulduğu için projenin başlık diline uymuyordu.
 *
 * `ton` anlamı renkle taşır: uyarı sarı, sorun kırmızı, olumlu yeşil. Şerit,
 * doku ve değer aynı tondan boyanır ki kart tek bir sinyal versin.
 */

export type OzetTon = "primary" | "amber" | "rose" | "emerald";

const TON: Record<
  OzetTon,
  { serit: string; doku: string; etiket: string; deger: string }
> = {
  primary: {
    serit: "bg-primary/10",
    doku: "fill-primary/4 stroke-primary/6",
    etiket: "text-primary",
    deger: "text-foreground",
  },
  amber: {
    serit: "bg-amber-500/10",
    doku: "fill-amber-500/5 stroke-amber-500/8",
    etiket: "text-amber-700",
    deger: "text-amber-600",
  },
  rose: {
    serit: "bg-rose-500/10",
    doku: "fill-rose-500/5 stroke-rose-500/8",
    etiket: "text-rose-700",
    deger: "text-rose-600",
  },
  emerald: {
    serit: "bg-emerald-500/10",
    doku: "fill-emerald-500/5 stroke-emerald-500/8",
    etiket: "text-emerald-700",
    deger: "text-emerald-600",
  },
};

export function OzetKart({
  etiket,
  deger,
  ikon: Ikon,
  ton = "primary",
  alt,
  className,
}: {
  etiket: string;
  /** Sayı ya da hazır biçimlenmiş metin (₺, birim, tarih…). */
  deger: React.ReactNode;
  ikon?: React.ComponentType<{ className?: string }>;
  ton?: OzetTon;
  /** Değerin altındaki küçük açıklama (opsiyonel). */
  alt?: string;
  className?: string;
}) {
  const t = TON[ton];
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center gap-2 overflow-hidden border-b px-3 py-1.5",
          t.serit,
        )}
      >
        <BaslikDokusu renkSinifi={t.doku} />
        {Ikon && <Ikon className={cn("relative z-10 size-4", t.etiket)} />}
        <span className={cn("relative z-10 text-sm font-medium", t.etiket)}>
          {etiket}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <div className={cn("text-2xl font-semibold tabular-nums", t.deger)}>
          {deger}
        </div>
        {alt && <p className="mt-0.5 text-xs text-muted-foreground">{alt}</p>}
      </div>
    </div>
  );
}
