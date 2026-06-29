"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Standart kart kabuğu — sade shadcn kartı (border + bg-card).
 * (Eski nested bej tasarımdan vazgeçildi; API geriye dönük uyumlu kaldı.)
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
      className={cn("rounded-lg border bg-card", className, innerClassName)}
      {...props}
    >
      {children}
    </div>
  );
}
