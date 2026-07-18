"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { sifreDogru } from "@/lib/db/sifre";
import { oturumAc, oturumKapat } from "@/lib/oturum";

/**
 * Giriş / çıkış action'ları.
 *
 * Hata mesajı bilerek tek tip: "kullanıcı yok" ile "şifre yanlış" ayrı ayrı
 * söylenirse hangi kullanıcı adlarının var olduğu öğrenilebilir.
 */

export type GirisSonuc = { ok: boolean; error?: string };

export async function girisYap(
  kullaniciAdi: string,
  sifre: string,
  hatirla = false,
): Promise<GirisSonuc> {
  const ad = kullaniciAdi.trim().toLocaleLowerCase("tr");
  if (!ad || !sifre) {
    return { ok: false, error: "Kullanıcı adı ve şifre zorunludur." };
  }

  try {
    const k = await db.kullanici.findUnique({
      where: { kullaniciAdi: ad },
      select: { id: true, sifreHash: true, durum: true },
    });

    // Kullanıcı yoksa da hash doğrulaması yapılır: erken dönmek yanıt süresini
    // kısaltıp "bu kullanıcı yok" bilgisini sızdırırdı.
    const sahte =
      "0".repeat(32) +
      ":" +
      "0".repeat(128);
    const gecerli = sifreDogru(sifre, k?.sifreHash ?? sahte);

    if (!k || !gecerli) {
      return { ok: false, error: "Kullanıcı adı veya şifre hatalı." };
    }
    if (k.durum !== "Aktif") {
      return { ok: false, error: "Bu kullanıcı pasif durumda." };
    }

    await oturumAc(k.id, hatirla);
    return { ok: true };
  } catch (e) {
    console.error("girisYap:", e);
    return { ok: false, error: "Giriş yapılamadı." };
  }
}

export async function cikisYap(): Promise<void> {
  await oturumKapat();
  redirect("/login");
}
