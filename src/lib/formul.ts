/**
 * Şablon formülleri için küçük aritmetik motoru.
 *
 * Modül şablonlarında parça ölçüleri sabit değil, modülün ölçülerinden
 * türüyor: kapak eni = (en - 2*kalinlik) / kapakSayisi gibi. Kullanıcı bunu
 * yazabilmeli.
 *
 * eval() ya da new Function() KULLANILMIYOR: formüller veritabanında duruyor
 * ve kullanıcı tarafından yazılıyor; ikisi de o metni çalıştırılabilir kod
 * hâline getirir. Burada yalnız sayı, değişken, + - * / ve parantez tanınır;
 * tanınmayan her şey hata döner.
 */

/** Formüllerde kullanılabilen değişkenler. */
export type FormulDegiskenleri = {
  /** Modül genişliği (mm). */
  en: number;
  /** Modül yüksekliği (mm). */
  boy: number;
  /** Modül derinliği (mm). */
  derinlik: number;
  /** Panel kalınlığı (mm). */
  kalinlik: number;
  /** Kapak adedi. */
  kapakSayisi: number;
  /** Raf adedi. */
  rafSayisi: number;
  /** Çekmece adedi. */
  cekmeceSayisi: number;
};

export const FORMUL_DEGISKENLERI: (keyof FormulDegiskenleri)[] = [
  "en",
  "boy",
  "derinlik",
  "kalinlik",
  "kapakSayisi",
  "rafSayisi",
  "cekmeceSayisi",
];

export const BOS_DEGISKENLER: FormulDegiskenleri = {
  en: 0,
  boy: 0,
  derinlik: 0,
  kalinlik: 18,
  kapakSayisi: 1,
  rafSayisi: 0,
  cekmeceSayisi: 0,
};

type Jeton =
  | { tip: "sayi"; deger: number }
  | { tip: "ad"; deger: string }
  | { tip: "islec"; deger: "+" | "-" | "*" | "/" }
  | { tip: "parantez"; deger: "(" | ")" };

const ONCELIK: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

/** Metni jetonlara ayırır. Tanınmayan karakterde null döner. */
function jetonla(metin: string): Jeton[] | null {
  const jetonlar: Jeton[] = [];
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "(" || c === ")") {
      jetonlar.push({ tip: "parantez", deger: c });
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      jetonlar.push({ tip: "islec", deger: c });
      i++;
      continue;
    }
    // Sayı — ondalık ayırıcı olarak hem nokta hem virgül kabul edilir;
    // kullanıcı Türkçe klavyede virgül yazıyor.
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < metin.length && /[0-9.,]/.test(metin[j])) j++;
      const ham = metin.slice(i, j).replace(",", ".");
      const n = Number(ham);
      if (!Number.isFinite(n)) return null;
      jetonlar.push({ tip: "sayi", deger: n });
      i = j;
      continue;
    }
    if (/[A-Za-zÇĞİÖŞÜçğıöşü_]/.test(c)) {
      let j = i;
      while (j < metin.length && /[A-Za-zÇĞİÖŞÜçğıöşü_0-9]/.test(metin[j])) j++;
      jetonlar.push({ tip: "ad", deger: metin.slice(i, j) });
      i = j;
      continue;
    }
    return null;
  }
  return jetonlar;
}

/**
 * Shunting-yard: jetonları sonek (RPN) sırasına çevirir.
 * Tekil eksi (-en gibi) 0 - en olarak ele alınır.
 */
function sonekeCevir(jetonlar: Jeton[]): Jeton[] | null {
  const cikti: Jeton[] = [];
  const yigin: Jeton[] = [];
  let oncekiDeger = false; // bir önceki jeton değer/kapanış mıydı?
  for (const j of jetonlar) {
    if (j.tip === "sayi" || j.tip === "ad") {
      cikti.push(j);
      oncekiDeger = true;
      continue;
    }
    if (j.tip === "islec") {
      if (!oncekiDeger && (j.deger === "-" || j.deger === "+")) {
        // Tekil işaret: 0 ile tamamlanır.
        cikti.push({ tip: "sayi", deger: 0 });
      }
      while (yigin.length) {
        const ust = yigin[yigin.length - 1];
        if (ust.tip !== "islec") break;
        if (ONCELIK[ust.deger] < ONCELIK[j.deger]) break;
        cikti.push(yigin.pop()!);
      }
      yigin.push(j);
      oncekiDeger = false;
      continue;
    }
    if (j.deger === "(") {
      yigin.push(j);
      oncekiDeger = false;
      continue;
    }
    // ")"
    let bulundu = false;
    while (yigin.length) {
      const ust = yigin.pop()!;
      if (ust.tip === "parantez" && ust.deger === "(") {
        bulundu = true;
        break;
      }
      cikti.push(ust);
    }
    if (!bulundu) return null; // eşleşmeyen parantez
    oncekiDeger = true;
  }
  while (yigin.length) {
    const ust = yigin.pop()!;
    if (ust.tip === "parantez") return null;
    cikti.push(ust);
  }
  return cikti;
}

export type FormulSonuc =
  | { ok: true; deger: number }
  | { ok: false; hata: string };

/**
 * Formülü verilen değişkenlerle hesaplar.
 *
 * Boş formül 0 döndürmez, HATA döndürür: "kapak eni boş" ile "kapak eni 0"
 * farklı şeyler; sessizce 0 kabul etmek sıfır ölçülü parça üretirdi.
 */
export function formulHesapla(
  formul: string,
  d: FormulDegiskenleri,
): FormulSonuc {
  const metin = (formul ?? "").trim();
  if (!metin) return { ok: false, hata: "Formül boş" };

  const jetonlar = jetonla(metin);
  if (!jetonlar) return { ok: false, hata: "Tanınmayan karakter" };
  if (jetonlar.length === 0) return { ok: false, hata: "Formül boş" };

  for (const j of jetonlar) {
    if (j.tip === "ad" && !(j.deger in d))
      return { ok: false, hata: `Bilinmeyen değişken: ${j.deger}` };
  }

  const sonek = sonekeCevir(jetonlar);
  if (!sonek) return { ok: false, hata: "Parantezler eşleşmiyor" };

  const yigin: number[] = [];
  for (const j of sonek) {
    if (j.tip === "sayi") {
      yigin.push(j.deger);
      continue;
    }
    if (j.tip === "ad") {
      yigin.push(d[j.deger as keyof FormulDegiskenleri]);
      continue;
    }
    if (j.tip !== "islec") return { ok: false, hata: "Geçersiz formül" };
    const b = yigin.pop();
    const a = yigin.pop();
    if (a === undefined || b === undefined)
      return { ok: false, hata: "Eksik işlenen" };
    if (j.deger === "/" && b === 0)
      return { ok: false, hata: "Sıfıra bölme" };
    yigin.push(
      j.deger === "+"
        ? a + b
        : j.deger === "-"
          ? a - b
          : j.deger === "*"
            ? a * b
            : a / b,
    );
  }
  if (yigin.length !== 1) return { ok: false, hata: "Geçersiz formül" };
  const sonuc = yigin[0];
  if (!Number.isFinite(sonuc)) return { ok: false, hata: "Sonuç sayı değil" };
  return { ok: true, deger: sonuc };
}

/**
 * Adet formülü: sonuç tam sayıya yuvarlanır ve negatif olamaz.
 * "2,5 kapak" diye bir şey yok; yarım adet üretim emrine düşerse
 * atölyede karşılığı olmayan bir satır olurdu.
 */
export function adetHesapla(formul: string, d: FormulDegiskenleri): FormulSonuc {
  const r = formulHesapla(formul, d);
  if (!r.ok) return r;
  const n = Math.round(r.deger);
  if (n < 0) return { ok: false, hata: "Adet negatif olamaz" };
  return { ok: true, deger: n };
}
