"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AnimatedIcon, AnimatedIconHandle } from "@/components/ui/icon-input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Projenin standart sheet kabuğu (tanımlama/detay işlemleri için).
 * Nested tasarım: bej dış alan (#f5f5f5 + diagonal doku, beyaz kenarlık)
 * → beyaz kayan form kartı → sabit beyaz footer (İptal/Kaydet).
 * Form alanları için: IconInput, AnimatedField, SearchSelect, Switch toggle kullan.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  icon: Icon,
  children,
  onSave,
  saveLabel = "Kaydet",
  cancelLabel = "İptal",
  footer,
  side = "right",
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: AnimatedIcon;
  children: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  /** Footer'ı tamamen değiştirmek istersen; verilirse İptal/Kaydet kullanılmaz. */
  footer?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  contentClassName?: string;
}) {
  const iconRef = React.useRef<AnimatedIconHandle>(null);

  // Açılışta başlık ikonunu oynat.
  React.useEffect(() => {
    if (open) iconRef.current?.startAnimation();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className="flex w-full flex-col gap-0.5 border-white bg-[#f5f5f5] p-2 sm:max-w-md"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(91,79,65,0.035) 0px, rgba(91,79,65,0.035) 1px, transparent 1px, transparent 4px)",
        }}
      >
        <SheetHeader className="flex h-9 flex-row items-center gap-2 px-3 py-0">
          {Icon && (
            <Icon ref={iconRef} size={18} className="text-muted-foreground" />
          )}
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto rounded-md border bg-card p-3.5",
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer ?? (
          <SheetFooter className="mt-1 flex-row justify-end gap-2 rounded-md border bg-card p-2">
            <SheetClose render={<Button variant="outline">{cancelLabel}</Button>} />
            {onSave && <Button onClick={onSave}>{saveLabel}</Button>}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
