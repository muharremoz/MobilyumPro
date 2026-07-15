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
 * Standart sheet kabuğu (tanımlama/detay işlemleri için) — orijinal shadcn Sheet.
 * Üstte başlık (ikon + kapatma butonu yerleşik), kayan içerik, altta border'lı footer.
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
  sheetClassName,
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
  /** Sheet genişliği vb. — SheetContent'e eklenir (örn. "sm:max-w-2xl"). */
  sheetClassName?: string;
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
        className={cn("flex w-full flex-col gap-0 p-0 sm:max-w-md", sheetClassName)}
      >
        <SheetHeader className="flex flex-row items-center gap-2 border-b p-4 pr-12">
          {Icon && (
            <Icon ref={iconRef} size={18} className="text-muted-foreground" />
          )}
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div
          className={cn("min-h-0 flex-1 overflow-auto p-4", contentClassName)}
        >
          {children}
        </div>

        {footer ?? (
          <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
            <SheetClose render={<Button variant="outline">{cancelLabel}</Button>} />
            {onSave && <Button onClick={onSave}>{saveLabel}</Button>}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
