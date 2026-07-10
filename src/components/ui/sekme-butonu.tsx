"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * PROJE STANDARDI — Sekme butonu (kayan alt çizgili).
 *
 * Aynı sekme grubundaki butonlar AYNI `layoutId`'yi paylaşır; aktif sekme
 * değişince alt çizgi sekmeler arası yumuşakça (spring) kayar. Sekme
 * içeriği ayrıca [ui/tab-icerik.tsx] ile animasyonlanır.
 *
 * Sarmalayıcı: `<div className="relative -mb-px flex ... border-b">` — çizgi
 * alt border'a otursun diye -mb-px verilir.
 */
export function SekmeButonu({
  aktif,
  onClick,
  layoutId,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  /** Aynı sekme grubundaki tüm butonlarda aynı değer (ör. "stokTabCizgi"). */
  layoutId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative cursor-pointer px-4 pt-1 pb-2.5 text-sm transition-colors",
        aktif
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {aktif && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </button>
  );
}
