"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle } from "@/components/ui/icon-input";

/** Etiket-yanı animasyonlu ikon; çocuk alana (select/textarea) odak/hover'da ikon oynar. */
export function AnimatedField({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  icon: AnimatedIcon;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<AnimatedIconHandle>(null);
  return (
    <div
      className={cn("grid gap-0.5", className)}
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
      onFocus={() => ref.current?.startAnimation()}
      onBlur={() => ref.current?.stopAnimation()}
    >
      <label className="flex items-center gap-1.5 text-sm font-medium">
        <Icon ref={ref} size={15} className="text-muted-foreground" />
        {label}
      </label>
      {children}
    </div>
  );
}
