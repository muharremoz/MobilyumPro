/**
 * Güçlü ama okunabilir şifre önerir: "Kfrt-9m2P-xQ7v" gibi.
 *
 * Karışan karakterler (0/O, 1/l/I) bilerek dışarıda: kurulum şifresi çoğu
 * zaman ekrandan okunup elle bir yere not ediliyor; "l" mi "1" mi derdi
 * çıkarmasın.
 *
 * Math.random DEĞİL crypto kullanılır — bu bir yönetici hesabının şifresi.
 */
const HARFLER = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
const RAKAMLAR = "23456789";
const ALFABE = HARFLER + RAKAMLAR;

function rastgeleKarakter(alfabe: string): string {
  const dizi = new Uint32Array(1);
  crypto.getRandomValues(dizi);
  // Modulo sapması: alfabe uzunluğu 2^32'yi bölmediği için son aralık
  // biraz daha olası olur. Bu ölçekte önemsiz ama düzeltmesi ucuz.
  const sinir = Math.floor(0xffffffff / alfabe.length) * alfabe.length;
  let n = dizi[0];
  while (n >= sinir) {
    crypto.getRandomValues(dizi);
    n = dizi[0];
  }
  return alfabe[n % alfabe.length];
}

export function sifreOner(): string {
  const gruplar: string[] = [];
  for (let g = 0; g < 3; g++) {
    let grup = "";
    for (let i = 0; i < 4; i++) grup += rastgeleKarakter(ALFABE);
    gruplar.push(grup);
  }
  const oneri = gruplar.join("-");

  // En az bir büyük harf ve bir rakam garanti edilir; rastgelelik bunu çoğu
  // zaman zaten sağlar ama "zayıf şifre" önermek kabul edilemez.
  const buyukVar = /[A-Z]/.test(oneri);
  const rakamVar = /[0-9]/.test(oneri);
  if (buyukVar && rakamVar) return oneri;
  return sifreOner();
}
