/**
 * PROJE STANDARDI — Liste dışa aktarma (CSV).
 *
 * Türkçe Excel için iki şart:
 *  - Ayraç `;` olmalı. Virgül ondalık ayracı olduğu için `,` ile ayrılan dosya
 *    tek sütunda açılır.
 *  - Dosya UTF-8 BOM ile başlamalı; yoksa Excel dosyayı ANSI sanıp Türkçe
 *    karakterleri bozar (ŞİFONYER → ÞÝFONYER).
 *
 * Sayılar Türkçe biçimlenir (1234.5 → "1234,5") — `;` ayracıyla çakışmaz.
 *
 * Kullanım:
 *   csvIndir("modeller", filtreli, [
 *     { baslik: "Kod", deger: (u) => u.id },
 *     { baslik: "Fiyat", deger: (u) => u.fiyat },
 *   ]);
 */

export type CsvKolon<T> = {
  baslik: string;
  deger: (satir: T) => string | number | null | undefined;
};

/** Bir hücreyi CSV'ye güvenli yazar: ayraç/tırnak/yeni satır varsa tırnaklar. */
function hucre(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s =
    typeof v === "number"
      ? // Türkçe ondalık: 1234.5 -> "1234,5". Binlik ayracı KOYULMAZ; "1.234,5"
        // olsaydı Excel noktayı ayraç sanıp bozabilirdi.
        Number.isFinite(v)
        ? String(v).replace(".", ",")
        : ""
      : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Satırları CSV metnine çevirir (BOM'suz — indirme sırasında eklenir). */
export function csvMetni<T>(satirlar: T[], kolonlar: CsvKolon<T>[]): string {
  const baslik = kolonlar.map((k) => hucre(k.baslik)).join(";");
  const govde = satirlar.map((s) =>
    kolonlar.map((k) => hucre(k.deger(s))).join(";"),
  );
  return [baslik, ...govde].join("\r\n");
}

/** `<ad>-<yyyy-aa-gg>.csv` — aynı listeyi iki kez alınca üzerine yazmasın. */
function dosyaAdi(ad: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${ad}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`;
}

/** CSV üretip indirir. Tarayıcıda çalışır (client component). */
export function csvIndir<T>(
  ad: string,
  satirlar: T[],
  kolonlar: CsvKolon<T>[],
): void {
  // ﻿ = UTF-8 BOM. Excel bunu görmezse Türkçe karakterler bozulur.
  const blob = new Blob(["﻿" + csvMetni(satirlar, kolonlar)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi(ad);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
