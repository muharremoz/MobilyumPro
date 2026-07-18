import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { BaslikDokusu } from "@/components/ui/baslik-dokusu";

/**
 * PROJE STANDARDI — Form bölümü kart başlığı.
 *
 * Bölüm kartlarının (rounded-md border bg-card) en üstüne konur; gövdenin
 * (grid gap-3 p-4) hemen üstünde. Hafif renkli arka plan (bg-muted/40) +
 * bölüme özel lucide ikon + başlık, sağda opsiyonel ek içerik.
 *
 * Kullanım:
 *   <div className="rounded-md border bg-card">
 *     <KartBaslik ikon={Info} baslik="Genel" />
 *     <div className="grid gap-3 p-4">…</div>
 *   </div>
 */
export function KartBaslik({
  ikon: Ikon,
  baslik,
  sag,
  className,
}: {
  ikon: LucideIcon;
  baslik: string;
  /** Başlığın sağına yaslanan opsiyonel içerik (açıklama, sayaç, buton). */
  sag?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Primary'nin açık tonu + altıgen doku — form bölümü başlık şeridi
        "relative flex items-center justify-between gap-2 overflow-hidden border-b bg-primary/10 px-4 py-2.5",
        className,
      )}
    >
      {/* Başlık şeridi dokusu — proje standardı (bkz. baslik-dokusu.tsx) */}
      <BaslikDokusu />

      <span className="relative z-10 flex items-center gap-2 text-sm font-medium text-primary">
        <Ikon className="size-4 text-primary" />
        {baslik}
      </span>
      {sag && <span className="relative z-10">{sag}</span>}
    </div>
  );
}
