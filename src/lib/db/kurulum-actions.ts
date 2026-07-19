"use server";

import { ilkKurulum, type IlkKurulumGirdi } from "@/lib/db/kurulum";
import type { SqlBilgi } from "@/lib/kurulum/env-dosya";
import {
  kurulumAdimi,
  kurulumOzeti,
  kurulumuBitir,
  lisansKaydet,
  sqlKur,
  sqlTest,
  type KurulumAdim,
} from "@/lib/kurulum/kurulum-islem";
import { oturumAc } from "@/lib/oturum";

/**
 * Kurulum sihirbazının action'ları.
 *
 * Her action önce `kurulumAdimi()`ne bakar: kurulum bittiyse hepsi kapanır.
 * Bu denetim istemciye güvenmemek içindir — sihirbaz ekranı gizlense bile
 * action'lar doğrudan çağrılabilir.
 */
async function kapaliMi(): Promise<boolean> {
  return (await kurulumAdimi()) === "bitti";
}

export async function kurulumDurumu(): Promise<KurulumAdim> {
  return kurulumAdimi();
}

export async function sqlBaglantiTest(bilgi: SqlBilgi) {
  if (await kapaliMi()) return { ok: false, error: "Kurulum tamamlanmış." };
  return sqlTest(bilgi);
}

export async function sqlKaydet(bilgi: SqlBilgi) {
  if (await kapaliMi()) return { ok: false, error: "Kurulum tamamlanmış." };
  return sqlKur(bilgi);
}

export async function yoneticiOlustur(girdi: IlkKurulumGirdi) {
  if (await kapaliMi()) return { ok: false, error: "Kurulum tamamlanmış." };
  return ilkKurulum(girdi);
}

export async function ozetGetir() {
  return kurulumOzeti();
}

export async function lisansGonder(firmaId: string, anahtar: string) {
  if (await kapaliMi()) return { ok: false, error: "Kurulum tamamlanmış." };
  return lisansKaydet(firmaId, anahtar);
}

/**
 * Son adım: sihirbazı kapatır ve yöneticinin oturumunu açar. Kurulumu yapan
 * kişiyi bir de giriş ekranına göndermek gereksiz sürtünme olurdu.
 */
export async function kurulumuSonlandir(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (await kapaliMi()) return { ok: true };

  const sonuc = await kurulumuBitir();
  if (!sonuc.ok) return sonuc;

  await oturumAc("USR-1001");
  return { ok: true };
}
