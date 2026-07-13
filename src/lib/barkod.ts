/** 12 haneli tabandan EAN-13 kontrol basamağı ekleyerek 13 haneli barkod üretir. */
export function ean13(taban12: string): string {
  let toplam = 0;
  for (let i = 0; i < 12; i++)
    toplam += Number(taban12[i]) * (i % 2 === 0 ? 1 : 3);
  const kontrol = (10 - (toplam % 10)) % 10;
  return taban12 + kontrol;
}

/** Bir koddaki sondaki sayıdan otomatik EAN-13 barkod (869 = Türkiye öneki). */
export function kodBarkod(kod: string): string {
  const m = /(\d+)$/.exec(kod);
  const no = m ? Number(m[1]) : 0;
  return ean13("869" + String(no).padStart(9, "0"));
}
