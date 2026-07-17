"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Zorunlu alan uyarısı — proje standardı (globals.css'teki
 * .t-input-wrap / .t-input / .t-error-msg kurallarıyla çalışır).
 *
 * Kullanım:
 *   const [nonce, setNonce] = React.useState(0);
 *   <ErrorShakeField error={hata} shakeNonce={nonce}>
 *     <Input ... />
 *   </ErrorShakeField>
 *   // geçersiz submit'te: setNonce(n => n + 1)  → hatalı alanlar sallanır
 *
 * `error` doluyken border destructive'e döner ve mesaj görünür; error
 * temizlenince --revert-dur ile nötrüne söner. Mesaj absolute konumlanır
 * (alanın üstünde, sağa yaslı — etiketle aynı satır), akışta yer kaplamaz.
 */
export function ErrorShakeField({
  error,
  shakeNonce = 0,
  children,
  className,
}: {
  error?: string | null;
  /** Her artışta (error doluysa) shake yeniden tetiklenir. */
  shakeNonce?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [sallaniyor, setSallaniyor] = React.useState(false);

  // Hata temizlendiğinde mesaj, fade-out bitene dek boyalı kalsın diye
  // son mesajı sakla (görünürlüğü .is-error yönetir).
  // Prop değişince state'i render sırasında ayarlama kalıbı (react.dev:
  // "Adjusting some state when a prop changes") — effect gerekmez.
  const [sonMesaj, setSonMesaj] = React.useState<string | null>(null);
  if (error && error !== sonMesaj) setSonMesaj(error);

  // is-shaking'i state ile yönet: sınıfı düşür → bir frame bekle → geri tak.
  // (classList ile eklemek işe yaramaz; React render'ı className'i ezer.)
  React.useEffect(() => {
    if (!error) return;
    // Sınıfı düşürme de frame içinde: effect gövdesinde senkron setState
    // zincirleme render tetikler (react-hooks/set-state-in-effect).
    const id = requestAnimationFrame(() => {
      setSallaniyor(false);
      requestAnimationFrame(() => setSallaniyor(true));
    });
    return () => cancelAnimationFrame(id);
  }, [error, shakeNonce]);

  return (
    <div
      className={cn("t-input-wrap relative", error && "is-error", className)}
    >
      <div
        className={cn(
          "t-input",
          error && "is-error",
          sallaniyor && "is-shaking",
        )}
        onAnimationEnd={() => setSallaniyor(false)}
      >
        {children}
      </div>
      <p className="t-error-msg pointer-events-none absolute right-0 bottom-full mb-1.5 text-right text-xs text-destructive">
        {error ?? sonMesaj}
      </p>
    </div>
  );
}
