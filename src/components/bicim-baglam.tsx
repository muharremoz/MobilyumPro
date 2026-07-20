"use client";

import * as React from "react";

import {
  paraFormatla,
  TL_BICIMI,
  type ParaBicimi,
} from "@/lib/para-bicim";

/**
 * Görüntüleme para birimini istemci bileşenlerine taşıyan bağlam.
 *
 * Neden bağlam: `para_birimi` ve kur sunucuda okunuyor, ama parayı basan
 * bileşenlerin çoğu istemci tarafında. Tek tek prop geçirmek 20 dosyada
 * zincir kurmak demekti.
 *
 * Sağlayıcı yoksa TL'ye düşülür — bir bileşen bağlam dışında render
 * edilirse patlamak yerine doğru ama çevrilmemiş değeri göstersin.
 */
const Baglam = React.createContext<ParaBicimi>(TL_BICIMI);

export function BicimSaglayici({
  bicim,
  children,
}: {
  bicim: ParaBicimi;
  children: React.ReactNode;
}) {
  return <Baglam.Provider value={bicim}>{children}</Baglam.Provider>;
}

/**
 * TL tutarını seçili para biriminde biçimleyen fonksiyon döndürür.
 * Kullanım: `const para = usePara(); ... para(tutar)`
 */
export function usePara(): (tlTutar: number) => string {
  const bicim = React.useContext(Baglam);
  return React.useCallback((v: number) => paraFormatla(v, bicim), [bicim]);
}

/** Seçili biçimin kendisi (simge/kod göstermek gerekirse). */
export function useParaBicimi(): ParaBicimi {
  return React.useContext(Baglam);
}
