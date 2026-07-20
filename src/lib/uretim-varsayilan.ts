import "server-only";
import { parametreMetin, parametreSayi } from "@/lib/db/parametre";
import type { UretimOncelik } from "@/lib/data";

/**
 * Üretim formlarının parametre kaynaklı varsayılanları.
 *
 * Tek yerde toplanmasının sebebi: aynı iki değer hem Üretim Planı hem
 * "Üretime Gönder" penceresi tarafından kullanılıyor ve termin hesabı
 * SUNUCUDA yapılmak zorunda — istemcide `new Date()` ile üretilirse sunucu
 * ile istemci farklı tarih basıp hidrasyon uyuşmazlığı çıkarır.
 */

const ONCELIKLER: UretimOncelik[] = ["Düşük", "Normal", "Yüksek", "Acil"];

export type UretimVarsayilan = {
  oncelik: UretimOncelik;
  /** "YYYY-AA-GG" — bugün + varsayilan_termin gün. */
  termin: string;
};

export async function uretimVarsayilanlari(): Promise<UretimVarsayilan> {
  const [ham, gun] = await Promise.all([
    parametreMetin("varsayilan_oncelik", "Normal"),
    parametreSayi("varsayilan_termin", 14),
  ]);

  // Parametre serbest metin olarak da kaydedilebiliyor; tanınmayan bir değer
  // forma düşerse seçim kutusu boş kalırdı.
  const oncelik = ONCELIKLER.includes(ham as UretimOncelik)
    ? (ham as UretimOncelik)
    : "Normal";

  const t = new Date();
  t.setDate(t.getDate() + Math.round(gun));
  // Yerel tarih parçalarından kuruyoruz; toISOString() UTC'ye kaydırıp
  // saat dilimine göre bir gün geriye atabiliyor.
  const termin = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate(),
  ).padStart(2, "0")}`;

  return { oncelik, termin };
}
