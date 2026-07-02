import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Şifre hash'leme (node:crypto scrypt — ek bağımlılık yok).
 * Saklama biçimi: "salt:hash" (ikisi de hex).
 */
export function sifreHashle(sifre: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(sifre, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function sifreDogru(sifre: string, sakli: string): boolean {
  const [salt, hash] = sakli.split(":");
  if (!salt || !hash) return false;
  const aday = scryptSync(sifre, salt, 64);
  const mevcut = Buffer.from(hash, "hex");
  return aday.length === mevcut.length && timingSafeEqual(aday, mevcut);
}
