// Para girişi maskeleme yardımcıları — TR biçimi: 1.234.567,89
// Form state maskelenmiş metni tutar; hesap/kayıt anında paraDegeri ile çözülür.

/** Serbest metni maskeye çevirir: rakam dışını atar, binlik nokta koyar,
 *  tek virgüle ve en fazla 2 ondalık haneye izin verir. */
export function paraMaskele(girdi: string): string {
  // Rakam ve ilk virgül dışındakileri temizle (yapıştırılan "1.250,50" da çözülür)
  const temiz = girdi.replace(/[^\d,]/g, "");
  const ilkVirgul = temiz.indexOf(",");
  let tam = ilkVirgul === -1 ? temiz : temiz.slice(0, ilkVirgul);
  const ondalik =
    ilkVirgul === -1
      ? null
      : temiz.slice(ilkVirgul + 1).replace(/,/g, "").slice(0, 2);
  tam = tam.replace(/^0+(?=\d)/, ""); // baştaki gereksiz sıfırlar
  const grupla = tam.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (ondalik === null) return grupla;
  return `${grupla || "0"},${ondalik}`;
}

/** Maskelenmiş metni sayıya çevirir ("1.250,50" → 1250.5; boş → 0). */
export function paraDegeri(maskeli: string): number {
  const n = Number(maskeli.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/** Sayıyı maske biçimine çevirir (formu doldururken; 0 → ""). */
export function paraMetni(deger: number): string {
  if (!deger) return "";
  return deger.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
