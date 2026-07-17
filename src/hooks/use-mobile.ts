import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Pencere genişliği harici bir kaynak — useSyncExternalStore ile okunur.
 * Effect'te setState edilmez (react-hooks/set-state-in-effect) ve sunucu
 * render'ı ile istemcinin ilk render'ı uyuşur (ikisi de false).
 */
const SORGU = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function abone(cb: () => void): () => void {
  const mql = window.matchMedia(SORGU)
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    abone,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false, // sunucu: genişlik bilinmez, masaüstü varsayılır
  )
}
