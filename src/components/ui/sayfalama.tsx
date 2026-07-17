"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * PROJE STANDARDI — Liste sayfalaması: sayfa boyutu seçimi + ileri/geri.
 *
 * Satır sayısı kullanıcı tercihidir; liste bazında localStorage'da tutulur
 * (`liste-sayfa-boyut:<listeId>`). Sunucuya/DB'ye yazılmaz — cihaza özeldir.
 *
 * Kullanım:
 *   const sayfalama = useSayfalama(filtreli, "stok-kartlari");
 *   ...
 *   {sayfalama.sayfalik.map(...)}
 *   ...
 *   <div className="flex items-center justify-between text-sm text-muted-foreground">
 *     <span>{filtreli.length} stok kartı</span>
 *     <SayfalamaKontrol sayfalama={sayfalama} />
 *   </div>
 *
 * Filtre değişince ilk sayfaya dönmek çağıranın sorumluluğu:
 *   React.useEffect(() => sayfalama.setSayfa(1), [filtreler]);
 */

export const SAYFA_BOYUTLARI = [10, 25, 50, 100] as const;
export const VARSAYILAN_SAYFA_BOYUT = 25;

const anahtar = (listeId: string) => `liste-sayfa-boyut:${listeId}`;

// localStorage harici bir store — useSyncExternalStore ile okunur. Böylece
// effect içinde setState edilmez (react-hooks/set-state-in-effect) ve sunucu
// render'ı ile istemci ilk render'ı uyuşur (ikisi de varsayılanı döner).
const dinleyiciler = new Set<() => void>();

function abone(cb: () => void): () => void {
  dinleyiciler.add(cb);
  // Başka sekmede değişirse burası da güncellensin.
  window.addEventListener("storage", cb);
  return () => {
    dinleyiciler.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function bildir(): void {
  for (const cb of dinleyiciler) cb();
}

function oku(listeId: string): number {
  try {
    const n = Number(window.localStorage.getItem(anahtar(listeId)));
    return (SAYFA_BOYUTLARI as readonly number[]).includes(n)
      ? n
      : VARSAYILAN_SAYFA_BOYUT;
  } catch {
    // Gizli sekme / erişim yok → varsayılan.
    return VARSAYILAN_SAYFA_BOYUT;
  }
}

export type Sayfalama<T> = {
  /** Aktif sayfadaki satırlar. */
  sayfalik: T[];
  aktifSayfa: number;
  toplamSayfa: number;
  sayfaBoyut: number;
  setSayfa: React.Dispatch<React.SetStateAction<number>>;
  setSayfaBoyut: (n: number) => void;
};

export function useSayfalama<T>(satirlar: T[], listeId: string): Sayfalama<T> {
  const [sayfa, setSayfa] = React.useState(1);

  const sayfaBoyut = React.useSyncExternalStore(
    abone,
    () => oku(listeId),
    () => VARSAYILAN_SAYFA_BOYUT, // sunucu: tercih bilinmez, varsayılan
  );

  const setSayfaBoyut = React.useCallback(
    (n: number) => {
      try {
        window.localStorage.setItem(anahtar(listeId), String(n));
      } catch {
        // Gizli sekme / kota dolu → tercih kaydedilmez, liste yine çalışır.
      }
      bildir();
      setSayfa(1); // boyut değişince sayfa numarası anlamını yitirir
    },
    [listeId],
  );

  const toplamSayfa = Math.max(1, Math.ceil(satirlar.length / sayfaBoyut));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = satirlar.slice(
    (aktifSayfa - 1) * sayfaBoyut,
    aktifSayfa * sayfaBoyut,
  );

  return { sayfalik, aktifSayfa, toplamSayfa, sayfaBoyut, setSayfa, setSayfaBoyut };
}

const ogeCls = (seciliMi: boolean) =>
  cn(
    "flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
    seciliMi && "bg-accent/60 font-medium",
  );

/** Sayfa boyutu seçici + sayfa göstergesi + ileri/geri. Altbilgiye konur. */
export function SayfalamaKontrol<T>({
  sayfalama,
  className,
}: {
  sayfalama: Sayfalama<T>;
  className?: string;
}) {
  const { aktifSayfa, toplamSayfa, sayfaBoyut, setSayfa, setSayfaBoyut } =
    sayfalama;
  const [acik, setAcik] = React.useState(false);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={acik} onOpenChange={setAcik}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" aria-label="Satır sayısı">
              {sayfaBoyut} satır
            </Button>
          }
        />
        <PopoverContent align="end" className="w-32 p-1.5">
          <div className="grid gap-0.5">
            {SAYFA_BOYUTLARI.map((n) => (
              <button
                key={n}
                type="button"
                className={ogeCls(sayfaBoyut === n)}
                onClick={() => {
                  setSayfaBoyut(n);
                  setAcik(false);
                }}
              >
                {n} satır
                {sayfaBoyut === n && <Check className="ml-auto size-4" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <span>
        Sayfa {aktifSayfa} / {toplamSayfa}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={aktifSayfa <= 1}
        onClick={() => setSayfa((p) => Math.max(1, p - 1))}
        aria-label="Önceki"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={aktifSayfa >= toplamSayfa}
        onClick={() => setSayfa((p) => Math.min(toplamSayfa, p + 1))}
        aria-label="Sonraki"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
