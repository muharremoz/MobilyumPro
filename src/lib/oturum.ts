import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { db } from "@/lib/db";
import { parametreSayi } from "@/lib/db/parametre";

/**
 * Oturum — imzalı çerez + her istekte DB'den tazeleme.
 *
 * Çerezde YALNIZCA kullanıcı id'si taşınır; rol, departman, istasyon gibi
 * bilgiler her istekte DB'den okunur. Böylece rol değişince veya kullanıcı
 * pasife alınınca etki anında olur — çereze gömülseydi süresi dolana kadar
 * eski yetkiyle dolaşılabilirdi.
 *
 * Çerez httpOnly + sameSite=lax: JS okuyamaz, form gönderimlerinde taşınır.
 * secure yalnız üretimde; geliştirme http://localhost üzerinden çalışıyor.
 */

const CEREZ = "mp_oturum";
// Varsayılan: bir vardiya. Sistem Parametreleri'ndeki `oturum_suresi` bunu
// ezer; parametre okunamazsa buraya düşülür.
// "Beni hatırla" işaretliyse paylaşılan atölye bilgisayarlarında riski
// büyütmemek için yine sınırlı (30 gün) tutulur ve parametreye BAĞLI DEĞİLDİR.
// DAKİKA cinsinden: `oturum_suresi` parametresinin birimi de dakika ("dk").
// Saat sanıp doğrudan geçirmek 480 dk'yı 480 SAATE (20 gün) çevirmişti.
const SURE_DK = 12 * 60;
const HATIRLA_DK = 30 * 24 * 60;

function anahtar(): Uint8Array {
  const s = process.env.OTURUM_ANAHTARI;
  // Zayıf varsayılana düşmek sessiz bir güvenlik açığı olurdu; açıkça patla.
  if (!s || s.length < 32) {
    throw new Error(
      "OTURUM_ANAHTARI tanımlı değil (en az 32 karakter). .env dosyasına ekleyin.",
    );
  }
  return new TextEncoder().encode(s);
}

export type Oturum = {
  id: string;
  kullaniciAdi: string;
  adSoyad: string;
  rol: string;
  departman?: string;
  istasyon?: string;
  yonetici: boolean;
};

/**
 * Girişten sonra çerezi yazar.
 * `hatirla` ile jetonun ömrü uzar — jeton süresi ve çerez maxAge birlikte
 * ayarlanır, yoksa çerez dururken jeton ölür (sessiz "oturum düştü").
 */
export async function oturumAc(
  kullaniciId: string,
  hatirla = false,
): Promise<void> {
  const dakika = hatirla
    ? HATIRLA_DK
    : await parametreSayi("oturum_suresi", SURE_DK);
  const jeton = await new SignJWT({ kid: kullaniciId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${Math.round(dakika)}m`)
    .sign(anahtar());

  const kutu = await cookies();
  kutu.set(CEREZ, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.round(dakika) * 60,
  });
}

export async function oturumKapat(): Promise<void> {
  const kutu = await cookies();
  kutu.delete(CEREZ);
}

/**
 * Geçerli oturum; yoksa/geçersizse/kullanıcı pasifse null.
 * Sayfalarda ve server action'larda kimlik kaynağı BURASIDIR — istemciden
 * gelen kullanıcı id'sine güvenilmez.
 */
export async function getOturum(): Promise<Oturum | null> {
  const kutu = await cookies();
  const jeton = kutu.get(CEREZ)?.value;
  if (!jeton) return null;

  let kid: string;
  try {
    const { payload } = await jwtVerify(jeton, anahtar());
    if (typeof payload.kid !== "string") return null;
    kid = payload.kid;
  } catch {
    // Süresi dolmuş veya imzası tutmayan jeton — oturum yok sayılır.
    return null;
  }

  const k = await db.kullanici.findUnique({
    where: { id: kid },
    select: {
      id: true,
      kullaniciAdi: true,
      adSoyad: true,
      rol: true,
      departman: true,
      istasyon: true,
      durum: true,
    },
  });
  if (!k || k.durum !== "Aktif") return null;

  return {
    id: k.id,
    kullaniciAdi: k.kullaniciAdi,
    adSoyad: k.adSoyad,
    rol: k.rol,
    departman: k.departman ?? undefined,
    istasyon: k.istasyon ?? undefined,
    yonetici: k.rol === "Yönetici",
  };
}

/**
 * Oturum zorunlu olan yerlerde kullanılır — yoksa hata fırlatır.
 * Sayfalarda tercih edilen yol layout guard'ıdır; bu daha çok server
 * action'lar için: kimliksiz çağrı sessizce devam etmemeli.
 */
export async function oturumZorunlu(): Promise<Oturum> {
  const o = await getOturum();
  if (!o) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  return o;
}
