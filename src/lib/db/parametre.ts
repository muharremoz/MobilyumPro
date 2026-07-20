import "server-only";
import { db } from "./index";
import { PARAMETRELER } from "@/lib/parametreler";

/**
 * Sistem parametrelerini tipli okuma.
 *
 * Var olma sebebi: bazı ayarlar ekranda duruyor ama kod onları hiç sormuyordu;
 * değer koda gömülüydü (kritik stok eşiği 5, oturum 12 saat, şifre 8 karakter).
 * Kullanıcı ayarı değiştirip kaydediyor, ekranda görüyor, ama davranış
 * değişmiyordu — boş bir alandan daha kötüsü.
 *
 * Kayıt yoksa `PARAMETRELER` içindeki varsayılan geçerlidir; o da yoksa
 * çağıranın verdiği yedek değer kullanılır.
 */

function tanimliVarsayilan(anahtar: string): string | undefined {
  return PARAMETRELER.find((p) => p.anahtar === anahtar)?.varsayilan;
}

export async function parametreMetin(
  anahtar: string,
  yedek = "",
): Promise<string> {
  try {
    const row = await db.sistemParametre.findUnique({ where: { anahtar } });
    return row?.deger ?? tanimliVarsayilan(anahtar) ?? yedek;
  } catch {
    // DB okunamazsa (kurulum öncesi, bağlantı arızası) uygulamayı
    // düşürmüyoruz; varsayılanla devam.
    return tanimliVarsayilan(anahtar) ?? yedek;
  }
}

/**
 * Sayısal parametre. Boş, bozuk ya da negatif değerde yedeğe düşer —
 * kullanıcı alanı silip kaydettiğinde 0 saatlik oturum ya da 0 karakterlik
 * şifre kuralı oluşmasın.
 */
export async function parametreSayi(
  anahtar: string,
  yedek: number,
): Promise<number> {
  const ham = await parametreMetin(anahtar);
  const n = Number(String(ham).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : yedek;
}

export async function parametreAcik(
  anahtar: string,
  yedek = false,
): Promise<boolean> {
  const ham = (await parametreMetin(anahtar)).trim().toLowerCase();
  if (ham === "true") return true;
  if (ham === "false") return false;
  return yedek;
}
