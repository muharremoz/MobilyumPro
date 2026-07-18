import * as React from "react";
import { X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { BaslikDokusu } from "@/components/ui/baslik-dokusu";

/** Başlıkta gösterilen aktif filtre çipi. */
export type AktifFiltre = {
  /** Kolon adı — "Grup", "Cins"… */
  etiket: string;
  /** Seçili değer — "KENARBANT", "18–24"… */
  deger: string;
  /**
   * Bu filtrenin TEK BAŞINA kaç kayıt tuttuğu (diğer filtreler yokmuş gibi).
   * Ekranda kalan toplam değil — o her çipte aynı sayıyı gösterirdi.
   */
  adet?: number;
  /** Çipin × düğmesi: filtreyi pasif değerine döndürür. */
  onKaldir: () => void;
};


/**
 * Liste kartı başlığı — proje standardı (ilk kullanım: kullanıcılar listesi).
 * Kartın en üstünde kompakt bir şerit: solda başlık, sağda aksiyon butonları.
 *
 * Aksiyon butonları size="sm" (h-8) olur — şeritteki tüm butonlar aynı
 * yükseklikte dursun diye; "Yeni X" butonu Plus ikonuyla gelir.
 *
 * `filtreler` verilirse başlığın yanında aktif filtre çipleri çıkar: hangi
 * kolonun süzüldüğü tek bakışta görünür, çipin ×'i o filtreyi kaldırır.
 * Kolon başlığı popover'ını tek tek açmaya gerek kalmaz.
 *
 * Kullanım:
 *   <ListHeader
 *     title="Malzeme"
 *     filtreler={[
 *       { etiket: "Grup", deger: grupF, onKaldir: () => setGrupF("Tümü") },
 *     ]}
 *   >
 *     <Button size="sm"><Plus className="size-4" /> Yeni</Button>
 *   </ListHeader>
 */
export function ListHeader({
  title,
  ikon: Ikon,
  filtreler,
  children,
  className,
}: {
  title: React.ReactNode;
  /** Başlığın solundaki ikon (KartBaslik'teki gibi) — opsiyonel. */
  ikon?: LucideIcon;
  /** Aktif filtreler — boş/verilmezse çip şeridi hiç render edilmez. */
  filtreler?: AktifFiltre[];
  /** Sağa yaslanan aksiyonlar (genelde butonlar). */
  children?: React.ReactNode;
  className?: string;
}) {
  const aktif = filtreler?.length ? filtreler : null;

  return (
    <div
      className={cn(
        // Primary'nin açık tonu + altıgen doku — kart başlık şeridi
        "relative flex items-center justify-between gap-3 overflow-hidden border-b bg-primary/10 px-3 py-1.5",
        className,
      )}
    >
      {/* Başlık şeridi dokusu — proje standardı (bkz. baslik-dokusu.tsx) */}
      <BaslikDokusu />

      <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-1.5">
        <h2 className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
          {Ikon && <Ikon className="size-4" />}
          {title}
        </h2>

        {aktif && (
          <>
            {aktif.map((f) => (
              <span
                key={f.etiket}
                className="inline-flex items-center gap-1 rounded-full bg-card py-0.5 pr-1 pl-2 text-xs shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
              >
                <span className="text-muted-foreground">{f.etiket}:</span>
                <span className="max-w-40 truncate font-medium">{f.deger}</span>
                {f.adet !== undefined && (
                  <span className="rounded-full bg-primary/10 px-1.5 font-medium tabular-nums text-primary">
                    {f.adet}
                  </span>
                )}
                <button
                  type="button"
                  onClick={f.onKaldir}
                  aria-label={`${f.etiket} filtresini kaldır`}
                  className="cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}

            {aktif.length > 1 && (
              <button
                type="button"
                onClick={() => aktif.forEach((f) => f.onKaldir())}
                className="cursor-pointer rounded-full px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Tümünü temizle
              </button>
            )}
          </>
        )}
      </div>

      {children && (
        <div className="relative z-10 flex shrink-0 items-center gap-1.5">
          {children}
        </div>
      )}
    </div>
  );
}
