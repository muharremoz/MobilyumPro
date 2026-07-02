"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Zorunlu alan uyarısı — proje standardı (globals.css'teki
 * .t-input-wrap / .t-input / .t-error-msg kurallarıyla çalışır).
 *
 * Kullanım:
 *   const ref = React.useRef<ErrorShakeHandle>(null);
 *   <ErrorShakeField ref={ref} error={hata}>
 *     <Input ... />
 *   </ErrorShakeField>
 *   // geçersiz submit'te: ref.current?.shake()
 *
 * `error` doluyken border destructive'e döner ve mesaj görünür;
 * error temizlenince --revert-dur ile nötrüne söner.
 */
export type ErrorShakeHandle = { shake: () => void };

export function ErrorShakeField({
  ref,
  error,
  children,
  className,
}: {
  ref?: React.Ref<ErrorShakeHandle>;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const kutu = React.useRef<HTMLDivElement>(null);

  // Hata temizlendiğinde mesaj, fade-out bitene dek boyalı kalsın diye
  // son mesajı sakla (görünürlüğü .is-error yönetir).
  const [sonMesaj, setSonMesaj] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (error) setSonMesaj(error);
  }, [error]);

  React.useImperativeHandle(ref, () => ({
    shake() {
      const el = kutu.current;
      if (!el) return;
      el.classList.remove("is-shaking");
      void el.offsetWidth; // reflow: animasyonu baştan başlat
      el.classList.add("is-shaking");
    },
  }));

  return (
    <div
      className={cn(
        "t-input-wrap flex flex-col gap-1.5",
        error && "is-error",
        className,
      )}
    >
      <div ref={kutu} className={cn("t-input", error && "is-error")}>
        {children}
      </div>
      <p className="t-error-msg min-h-4 text-xs text-destructive">
        {error ?? sonMesaj}
      </p>
    </div>
  );
}
