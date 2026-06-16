"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Projenin standart nested kart kabuğu: dış bej alan (#f5f5f5 + diagonal doku
 * + beyaz kenarlık) → içeride beyaz içerik kartı.
 * FormSheet / ConfirmDialog ile aynı dili kart yüzeylerine taşır.
 */
export function NestedCard({
  className,
  innerClassName,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  innerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-white bg-[#f5f5f5] p-1.5",
        className,
      )}
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(91,79,65,0.035) 0px, rgba(91,79,65,0.035) 1px, transparent 1px, transparent 4px)",
      }}
      {...props}
    >
      <div className={cn("rounded-md border bg-card", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
