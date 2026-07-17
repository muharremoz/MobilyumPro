import * as React from "react";

/**
 * PROJE STANDARDI — Sunucudan gelen prop'un yerel (iyimser) kopyası.
 *
 * Listeler sil/çoğalt/durum-değiştir işlemlerinde önce yerel kopyayı günceller
 * (iyimser), sunucu hata verirse geri alır. Prop yeni veri getirdiğinde
 * (router.refresh sonrası) kopya tazelenmeli.
 *
 * Bunu `useEffect(() => setListe(prop), [prop])` ile yapmak zincirleme render
 * üretir (render → effect → setState → render) ve
 * react-hooks/set-state-in-effect ihlalidir. Bunun yerine React'ın belgelenmiş
 * "prop değişince state'i render sırasında ayarla" kalıbı kullanılır:
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 * React bu setState'i fark edip commit etmeden hemen yeniden render eder.
 *
 * Karşılaştırma kimlik (===) üzerinden: sunucu her yanıtta yeni dizi döndürür.
 *
 * Kullanım:
 *   const [liste, setListe] = usePropAynasi(stoklar);
 *   // iyimser sil:
 *   const onceki = liste;
 *   setListe((l) => l.filter((x) => x.id !== id));
 *   if (!(await stokSil(id)).ok) setListe(onceki);
 */
export function usePropAynasi<T>(
  prop: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [deger, setDeger] = React.useState<T>(prop);
  const [oncekiProp, setOncekiProp] = React.useState<T>(prop);

  if (prop !== oncekiProp) {
    setOncekiProp(prop);
    setDeger(prop);
  }

  return [deger, setDeger];
}
