"use client";

import * as React from "react";

import { AraclarPaneli, type AracSekme } from "@/components/araclar/araclar-paneli";

/**
 * Araçlar panelini herhangi bir yerden açabilmek için ortak bağlam.
 *
 * Panel header'da duruyordu ve state'i oradaydı; pano kısayolları da onu
 * açabilsin diye state yukarı taşındı. URL parametresi yerine bağlam:
 * araç açmak bir gezinme değil, bulunduğun sayfada kalman gerekiyor.
 */

type AraclarApi = {
  /** Paneli açar; sekme verilmezse son/varsayılan sekmede açılır. */
  aracAc: (sekme?: AracSekme) => void;
};

const Baglam = React.createContext<AraclarApi | null>(null);

export function useAraclar(): AraclarApi {
  const b = React.useContext(Baglam);
  if (!b) throw new Error("useAraclar, AraclarSaglayici içinde kullanılmalı.");
  return b;
}

export function AraclarSaglayici({ children }: { children: React.ReactNode }) {
  const [acik, setAcik] = React.useState(false);
  const [sekme, setSekme] = React.useState<AracSekme>("birim");

  const api = React.useMemo<AraclarApi>(
    () => ({
      aracAc: (s) => {
        if (s) setSekme(s);
        setAcik(true);
      },
    }),
    [],
  );

  return (
    <Baglam.Provider value={api}>
      {children}
      <AraclarPaneli
        acik={acik}
        onAcikDegis={setAcik}
        sekme={sekme}
        onSekmeDegis={setSekme}
      />
    </Baglam.Provider>
  );
}
