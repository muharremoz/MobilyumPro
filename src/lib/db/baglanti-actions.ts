"use server";

import { PrismaClient } from "@prisma/client";

import { baglantiCoz, baglantiUrl, type Baglanti } from "./baglanti";

/** Boş şifre gelirse mevcut .env şifresini koru (tarayıcıya şifre gitmez). */
function sifreliBaglanti(b: Baglanti): Baglanti {
  if (b.password) return b;
  const mevcut = baglantiCoz(process.env.DATABASE_URL);
  return { ...b, password: mevcut.password };
}

/** Aday bağlantıyla geçici client kurup SELECT ile dener. */
export async function baglantiTest(
  b: Baglanti,
): Promise<{ ok: boolean; error?: string; surum?: string }> {
  const url = baglantiUrl(sifreliBaglanti(b));
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    const rows = await client.$queryRawUnsafe<{ surum: string }[]>(
      "SELECT @@VERSION AS surum",
    );
    const surum = rows?.[0]?.surum?.split("\n")[0]?.trim();
    return { ok: true, surum };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error)?.message?.split("\n")[0]?.slice(0, 300) ?? "Bağlanılamadı.",
    };
  } finally {
    await client.$disconnect();
  }
}

/** DATABASE_URL'i .env'e yazar (diğer satırları korur). Etkili olması için restart gerekir. */
export async function baglantiKaydet(
  b: Baglanti,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = baglantiUrl(sifreliBaglanti(b));
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const envPath = path.join(process.cwd(), ".env");

    let icerik = "";
    try {
      icerik = await fs.readFile(envPath, "utf8");
    } catch {
      // .env yok — yeni oluşturulacak.
    }
    const satir = `DATABASE_URL="${url}"`;
    if (/^DATABASE_URL=.*$/m.test(icerik)) {
      icerik = icerik.replace(/^DATABASE_URL=.*$/m, satir);
    } else {
      icerik = icerik ? `${icerik.replace(/\n?$/, "\n")}${satir}\n` : `${satir}\n`;
    }
    await fs.writeFile(envPath, icerik, "utf8");
    return { ok: true };
  } catch {
    return { ok: false, error: ".env yazılamadı." };
  }
}
