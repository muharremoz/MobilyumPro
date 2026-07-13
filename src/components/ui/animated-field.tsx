"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon } from "@/components/ui/icon-input";

/** Etiketli alan sarmalayıcı (select/textarea vb.) — sade başlık, ikon yok. */
export function AnimatedField({
  label,
  className,
  children,
}: {
  label: string;
  /** Geriye uyumluluk için tutuluyor; başlıkta artık gösterilmiyor. */
  icon?: AnimatedIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-0.5", className)}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
