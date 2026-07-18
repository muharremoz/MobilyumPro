import { HexagonPattern } from "@/components/ui/hexagon-pattern";

/**
 * PROJE STANDARDI — başlık şeridi dokusu (altıgen, projenin kimliği).
 *
 * Hem liste kartı başlığında (ListHeader) hem sayfa içi bölüm başlığında
 * (KartBaslik) aynı desen kullanılır; ayarlar burada tek yerde durur ki
 * ikisi zamanla birbirinden ayrılmasın.
 *
 * Kullanan şeride iki şey düşer:
 *   1. `relative overflow-hidden` — desen mutlak konumlu, taşmasın
 *   2. içerik katmanlarına `relative z-10` — desenin üstünde kalsınlar
 *
 * Maske dokuyu soldan sağa eritir: başlık metni ve sağdaki butonlar temiz
 * zeminde kalır, desen yalnız sağ tarafta belirip kenarda yine söner.
 *
 * Fade bitişi genişliğe göre dinamik: `min(97%, 100% - 150px)`.
 *   - Geniş şeritte yüzde belirleyicidir → desen şeridin çoğunu kaplar.
 *   - Dar kartta `100% - 150px` küçük kalır → başlık metnine her koşulda en az
 *     150px temiz alan bırakılır. Salt yüzde kullanılsaydı dar kartta desen
 *     başlığın altına girerdi.
 * Sağ uçtaki ilk 24px her koşulda temiz: butonlar desenin üstüne binmesin.
 */

/**
 * Dolu petekler — [sütun, satır]. Sabit liste: rastgele üretim sunucu ile
 * istemcinin farklı desen çizmesine, yani hydration uyuşmazlığına yol açar.
 * Aralık geniş tutuldu; dar kartta küçük sütunlar, geniş şeritte büyükleri
 * görünür (maske gerisini zaten gizler).
 */
const DOLU_PETEKLER: Array<[number, number]> = [
  [6, 1],
  [10, 0],
  [14, 1],
  [19, 0],
  [23, 0],
  [27, 1],
  [34, 0],
  [39, 1],
  [45, 0],
  [48, 1],
  [55, 1],
  [59, 0],
  [66, 0],
  [70, 1],
  [77, 1],
  [83, 0],
  [88, 1],
  [94, 0],
];

export function BaslikDokusu() {
  return (
    <HexagonPattern
      radius={12}
      hexagons={DOLU_PETEKLER}
      className="z-0 fill-primary/8 stroke-primary/12 [mask-image:linear-gradient(to_left,transparent_0px,black_24px,transparent_min(97%,calc(100%_-_150px)))]"
    />
  );
}
