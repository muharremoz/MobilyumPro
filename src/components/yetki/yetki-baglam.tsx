"use client";

import * as React from "react";

import { BOS_YETKI, type ModulYetki } from "@/lib/yetki";

/**
 * Yetki bağlamı — istemci tarafında buton/aksiyon gizleme için.
 *
 * Prop olarak 15 sayfadan tek tek geçirmek yerine bağlam: yeni bir liste
 * eklendiğinde sayfayı da değiştirmek gerekmesin.
 *
 * UYARI: burası yalnızca GÖRÜNÜRLÜK içindir, güvenlik değil. Gerçek kontrol
 * server action'larda ve sayfa guard'larında (lib/yetki-sunucu.ts). İstemci
 * bayrakları kurcalanabilir; sunucu yine reddeder.
 */

type YetkiDurumu = {
  moduller: Record<string, ModulYetki>;
  /** Yönetici tüm kontrolleri atlar (bkz. lib/yetki-sunucu.ts). */
  yonetici: boolean;
};

const Baglam = React.createContext<YetkiDurumu>({
  moduller: {},
  yonetici: false,
});

export function YetkiSaglayici({
  moduller,
  yonetici,
  children,
}: YetkiDurumu & { children: React.ReactNode }) {
  const deger = React.useMemo(
    () => ({ moduller, yonetici }),
    [moduller, yonetici],
  );
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

/** Bir modülün bayrakları. Kaydı yoksa hepsi kapalı; yöneticide hepsi açık. */
export function useYetki(modul: string): ModulYetki {
  const { moduller, yonetici } = React.useContext(Baglam);
  if (yonetici)
    return { isList: true, isAdd: true, isUpdate: true, isDelete: true };
  return moduller[modul] ?? BOS_YETKI;
}

/** Yalnız yöneticiye açık işler (tüm kullanıcıları etkileyen ayarlar gibi). */
export function useYonetici(): boolean {
  return React.useContext(Baglam).yonetici;
}
