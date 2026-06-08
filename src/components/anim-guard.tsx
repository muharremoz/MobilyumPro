"use client";

import * as React from "react";

/**
 * Animasyonlu ikonların (motion/react) zararsız bir zamanlama hatasını yutar.
 *
 * pqoqubbw ikonlarının `startAnimation` metodu `controls.start()` çağırır;
 * motion bileşeni henüz mount olmadan çağrılırsa motion şu hatayı fırlatır:
 *   "controls.start() should only be called after a component has mounted."
 * Çağrılar fire-and-forget olduğundan (await/catch yok) bu, yakalanmayan bir
 * promise reddine dönüşür ve dev sunucusunu düşürür. Hata tamamen kozmetiktir
 * (yalnızca ikon animasyonu), bu yüzden yalnızca bu özel reddi bastırıyoruz.
 */
export function AnimGuard() {
  React.useEffect(() => {
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      const msg =
        typeof reason === "string" ? reason : (reason?.message ?? "");
      if (msg.includes("controls.start()")) {
        e.preventDefault();
      }
    }
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  return null;
}
