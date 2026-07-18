"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type {
  AnimatedIcon,
  AnimatedIconHandle,
} from "@/components/ui/icon-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type OnaySecenek = {
  title: string;
  description?: string;
  icon?: AnimatedIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Bilgilendirme modu: tek buton, iptal yok (uyar() bunu kullanır). */
  tekButon?: boolean;
};

/**
 * Promise tabanlı onay — `const { onayla, onayDialog } = useOnay()`.
 * Handler içinde: `if (!(await onayla({ title, description }))) return;`
 * JSX'e `{onayDialog}` eklenir. Silme gibi işlemler için destructive varsayılan.
 */
export function useOnay() {
  const [durum, setDurum] = React.useState<{
    open: boolean;
    opts: OnaySecenek;
  }>({ open: false, opts: { title: "" } });
  const cevapRef = React.useRef<((v: boolean) => void) | null>(null);

  const onayla = React.useCallback((opts: OnaySecenek) => {
    return new Promise<boolean>((resolve) => {
      cevapRef.current = resolve;
      setDurum({ open: true, opts });
    });
  }, []);

  /**
   * Bilgilendirme modalı — engel/uyarı mesajları için (toast yerine).
   * Kullanıcı okuyup kapatır; seçim istemez.
   */
  const uyar = React.useCallback(
    (opts: Omit<OnaySecenek, "tekButon" | "destructive">) => {
      return new Promise<boolean>((resolve) => {
        cevapRef.current = resolve;
        setDurum({
          open: true,
          opts: {
            ...opts,
            tekButon: true,
            destructive: false,
            confirmLabel: opts.confirmLabel ?? "Anladım",
          },
        });
      });
    },
    [],
  );

  const bitir = React.useCallback((sonuc: boolean) => {
    cevapRef.current?.(sonuc);
    cevapRef.current = null;
    setDurum((d) => ({ ...d, open: false }));
  }, []);

  const onayDialog = (
    <ConfirmDialog
      open={durum.open}
      onOpenChange={(o) => {
        if (!o) bitir(false);
      }}
      title={durum.opts.title}
      description={durum.opts.description}
      icon={durum.opts.icon}
      confirmLabel={durum.opts.confirmLabel ?? "Sil"}
      cancelLabel={durum.opts.cancelLabel ?? "İptal"}
      destructive={durum.opts.destructive ?? true}
      tekButon={durum.opts.tekButon}
      onConfirm={() => bitir(true)}
    />
  );

  return { onayla, uyar, onayDialog };
}

/**
 * Standart onay (alert) dialog'u — orijinal shadcn AlertDialog tasarımı.
 * İkon, shadcn'in media slotunda (sol üstte kutu içinde) gösterilir.
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
  tekButon = false,
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
  /** Tek buton (bilgilendirme) — İptal gizlenir. */
  tekButon?: boolean;
  onConfirm?: () => void;
}) {
  const iconRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (open) iconRef.current?.startAnimation();
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {Icon && (
            <AlertDialogMedia
              className={cn(
                destructive && "bg-destructive/10 text-destructive",
              )}
            >
              <Icon ref={iconRef} size={20} />
            </AlertDialogMedia>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!tekButon && <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>}
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
