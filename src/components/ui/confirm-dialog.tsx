"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { AnimatedIcon, AnimatedIconHandle } from "@/components/ui/icon-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Projenin standart onay (alert) dialog'u — FormSheet ile aynı nested dil:
 * bej dış alan (#f5f5f5 + diagonal doku + beyaz kenarlık) → beyaz içerik kartı → beyaz footer.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: AnimatedIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
}) {
  const iconRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (open) iconRef.current?.startAnimation();
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="grid gap-1 border-white bg-[#f5f5f5] p-2 ring-0 sm:max-w-sm"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(91,79,65,0.035) 0px, rgba(91,79,65,0.035) 1px, transparent 1px, transparent 4px)",
        }}
      >
        <div className="flex items-start gap-3 rounded-md border bg-card p-4">
          {Icon && (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                destructive
                  ? "bg-rose-100 text-rose-600"
                  : "bg-muted text-foreground",
              )}
            >
              <Icon ref={iconRef} size={18} />
            </span>
          )}
          <div className="grid gap-1">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            )}
          </div>
        </div>

        <div className="flex flex-row justify-end gap-2 rounded-md border bg-card p-2">
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
