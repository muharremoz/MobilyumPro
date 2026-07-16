"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Liste "Görsel" kolonu hücresi: küçük thumbnail; tıklayınca büyür,
 * birden fazla resim varsa ok tuşları/oklarla slider. Kendi lightbox'ını
 * portalla body'ye basar (satır tıklamasını engeller).
 */
export function GorselHucre({
  gorseller,
  alt,
}: {
  gorseller?: string[];
  alt: string;
}) {
  const resimler = gorseller ?? [];
  const [acik, setAcik] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const coklu = resimler.length > 1;
  const ilk = resimler[0];

  const git = React.useCallback(
    (yon: number) =>
      setIdx((i) => (i + yon + resimler.length) % resimler.length),
    [resimler.length],
  );

  React.useEffect(() => {
    if (!acik) return;
    const el = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
      else if (e.key === "ArrowRight") git(1);
      else if (e.key === "ArrowLeft") git(-1);
    };
    document.addEventListener("keydown", el);
    return () => document.removeEventListener("keydown", el);
  }, [acik, git]);

  return (
    <>
      <button
        type="button"
        disabled={!ilk}
        onClick={(e) => {
          e.stopPropagation();
          setIdx(0);
          setAcik(true);
        }}
        aria-label={ilk ? `${alt} — büyüt` : "Görsel yok"}
        className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 transition-transform enabled:cursor-zoom-in enabled:hover:scale-105 disabled:cursor-default"
      >
        {ilk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ilk} alt={alt} className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-4 text-muted-foreground/40" />
        )}
        {coklu && (
          <span className="absolute right-0 bottom-0 rounded-tl bg-black/60 px-1 text-[9px] leading-tight font-medium text-white">
            {resimler.length}
          </span>
        )}
      </button>

      {acik &&
        ilk &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={() => setAcik(false)}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <button
              type="button"
              onClick={() => setAcik(false)}
              aria-label="Kapat"
              className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            {coklu && (
              <button
                type="button"
                aria-label="Önceki"
                onClick={(e) => {
                  e.stopPropagation();
                  git(-1);
                }}
                className="absolute left-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={idx}
              src={resimler[idx]}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl animate-in fade-in duration-150"
            />

            {coklu && (
              <button
                type="button"
                aria-label="Sonraki"
                onClick={(e) => {
                  e.stopPropagation();
                  git(1);
                }}
                className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {coklu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white tabular-nums"
              >
                {idx + 1} / {resimler.length}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
