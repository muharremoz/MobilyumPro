"use server";

import { ilkKurulum, type IlkKurulumGirdi } from "@/lib/db/kurulum";
import { oturumAc } from "@/lib/oturum";

/**
 * Kurulum formunun action'ı. Asıl iş ve "kapı açık mı" denetimi
 * `lib/db/kurulum.ts` içindedir — burada yalnız oturum açılır.
 */
export async function kurulumuTamamla(
  girdi: IlkKurulumGirdi,
): Promise<{ ok: boolean; error?: string }> {
  const sonuc = await ilkKurulum(girdi);
  if (!sonuc.ok) return sonuc;

  // Kurulumu yapan kişi zaten yöneticidir; bir de login ekranına
  // göndermek gereksiz sürtünme olurdu.
  await oturumAc("USR-1001");
  return { ok: true };
}
