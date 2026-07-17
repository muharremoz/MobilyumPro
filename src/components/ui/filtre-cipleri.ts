import type { AktifFiltre } from "@/components/ui/list-header";

/**
 * PROJE STANDARDI — ListHeader'daki aktif filtre çiplerini toplar.
 *
 * Her liste kendi filtre state'lerini bildirir; toplayıcı pasif olanları
 * (boş metin / "Tümü" / boş aralık) kendisi eler, adetleri hesaplar.
 *
 * adet: o filtrenin TEK BAŞINA tuttuğu kayıt sayısı — diğer filtreler yokmuş
 * gibi. "Ekranda kalan toplam" olsaydı her çipte aynı sayı çıkar, bilgi
 * taşımazdı.
 *
 * Kullanım:
 *   const cip = filtreCipleri(liste);
 *   cip.metin("Ad", adFiltre, (s) => s.ad, () => setAdFiltre(""));
 *   cip.liste("Durum", durumF, (s) => s.durum, () => setDurumF("Tümü"));
 *   cip.sayi("Miktar", sayiFiltre.miktar, (s) => s.miktar, () => …);
 *   <ListHeader title="…" filtreler={cip.sonuc()}>
 */
export function filtreCipleri<T>(liste: T[]) {
  const cipler: AktifFiltre[] = [];
  const say = (kosul: (x: T) => boolean) => liste.filter(kosul).length;
  const kucult = (v: string) => v.toLocaleLowerCase("tr");

  return {
    /** "İçeren" metin filtresi — deger boşsa çip çıkmaz. */
    metin(
      etiket: string,
      deger: string,
      alan: (x: T) => string | undefined,
      sifirla: () => void,
    ) {
      if (!deger) return;
      const q = kucult(deger);
      cipler.push({
        etiket,
        deger,
        adet: say((x) => kucult(alan(x) ?? "").includes(q)),
        onKaldir: sifirla,
      });
    },

    /** Seçim listesi — deger pasif değere ("Tümü") eşitse çip çıkmaz. */
    liste(
      etiket: string,
      deger: string,
      alan: (x: T) => string | undefined,
      sifirla: () => void,
      tumu = "Tümü",
    ) {
      if (deger === tumu) return;
      cipler.push({
        etiket,
        deger,
        adet: say((x) => alan(x) === deger),
        onKaldir: sifirla,
      });
    },

    /** Sayı aralığı — min ve max boşsa çip çıkmaz. */
    sayi(
      etiket: string,
      aralik: { min: string; max: string },
      alan: (x: T) => number,
      sifirla: () => void,
    ) {
      const { min, max } = aralik;
      if (!min && !max) return;
      cipler.push({
        etiket,
        deger: min && max ? `${min} – ${max}` : min ? `≥ ${min}` : `≤ ${max}`,
        adet: say(
          (x) =>
            (min === "" || alan(x) >= Number(min)) &&
            (max === "" || alan(x) <= Number(max)),
        ),
        onKaldir: sifirla,
      });
    },

    /** Toplanan çipler — ListHeader'ın `filtreler` prop'una verilir. */
    sonuc: (): AktifFiltre[] => cipler,
  };
}
