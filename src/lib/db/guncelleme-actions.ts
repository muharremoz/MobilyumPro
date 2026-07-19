"use server";

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

import { db } from "./index";
import { getOturum } from "@/lib/oturum";
import { yetkiVarMi } from "@/lib/yetki-sunucu";

const execFileP = promisify(execFile);

export type GuncellemeMod = "otomatik" | "elle" | "kapali";

export type GuncellemeDurum = {
  /** Sunucuda kurulu sürüm (package.json). */
  mevcut: string;
  /** Git'teki en yeni sürüm etiketi (vX.Y.Z) — kontrol yapılmadıysa null. */
  enYeni: string | null;
  /** Yeni sürüm var mı. */
  guncellemeVar: boolean;
  /** Kontrol anında internet erişimi var mıydı. */
  internetVar: boolean;
  /** Uygulama modu. */
  mod: GuncellemeMod;
  /** Gece otomatik güncelleme saati (HH:MM). */
  saat: string;
};

const VARSAYILAN_SAAT = "02:00";

/** package.json'daki mevcut sürüm. */
function mevcutSurum(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    return typeof pkg.version === "string" ? pkg.version : "?";
  } catch {
    return "?";
  }
}

async function parametre(anahtar: string): Promise<string | null> {
  const row = await db.sistemParametre.findUnique({ where: { anahtar } });
  return row?.deger ?? null;
}

/** Yönetici (ayarlar/isUpdate) değilse hata döndürür. */
async function yoneticiMi(): Promise<{ ok: false; error: string } | null> {
  const o = await getOturum();
  if (!o) return { ok: false, error: "Oturum bulunamadı. Tekrar giriş yapın." };
  if (await yetkiVarMi("ayarlar", "isUpdate", o)) return null;
  return { ok: false, error: "Bu işlem için yetkiniz yok." };
}

/**
 * Sadece yerel/hızlı bilgiler: mevcut sürüm + kayıtlı mod/saat.
 * Ağ kontrolü yapmaz (sayfa açılışı için). "Yeni sürüm var mı" öğrenmek için
 * ayrıca guncellemeKontrolEt() çağrılır.
 */
export async function guncellemeAyarlari(): Promise<GuncellemeDurum> {
  const mod = (await parametre("guncelleme_mod")) as GuncellemeMod | null;
  const saat = await parametre("guncelleme_saat");
  return {
    mevcut: mevcutSurum(),
    enYeni: null,
    guncellemeVar: false,
    internetVar: false,
    mod: mod ?? "elle",
    saat: saat ?? VARSAYILAN_SAAT,
  };
}

/**
 * Ağ üzerinden yeni sürüm kontrolü (guncelle.mjs --kontrol).
 * Butona basınca çalışır; sayfa açılışında değil (git fetch yavaş olabilir).
 */
export async function guncellemeKontrolEt(): Promise<
  { ok: true; durum: GuncellemeDurum } | { ok: false; error: string }
> {
  const engel = await yoneticiMi();
  if (engel) return engel;
  try {
    const { stdout } = await execFileP(
      "node",
      ["scripts/guncelle.mjs", "--kontrol"],
      { cwd: process.cwd(), timeout: 60000 },
    );
    const j = JSON.parse(stdout.trim());
    const temel = await guncellemeAyarlari();
    return {
      ok: true,
      durum: {
        ...temel,
        enYeni: j.enYeni ?? null,
        guncellemeVar: Boolean(j.guncellemeVar),
        internetVar: Boolean(j.internetVar),
      },
    };
  } catch {
    return { ok: false, error: "Güncelleme kontrolü yapılamadı." };
  }
}

/** Mod + saat ayarını kaydeder (yönetici). */
export async function guncellemeAyarKaydet(
  mod: GuncellemeMod,
  saat: string,
): Promise<{ ok: boolean; error?: string }> {
  const engel = await yoneticiMi();
  if (engel) return engel;
  if (!["otomatik", "elle", "kapali"].includes(mod)) {
    return { ok: false, error: "Geçersiz mod." };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(saat)) {
    return { ok: false, error: "Saat HH:MM biçiminde olmalı." };
  }
  try {
    for (const [anahtar, deger] of [
      ["guncelleme_mod", mod],
      ["guncelleme_saat", saat],
    ] as const) {
      await db.sistemParametre.upsert({
        where: { anahtar },
        create: { anahtar, deger },
        update: { deger },
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Ayar kaydedilemedi." };
  }
}

/**
 * Güncellemeyi HEMEN uygular ("Şimdi uygula" butonu). Yönetici gerektirir.
 *
 * Güncelleyici ayrı, KOPUK (detached) bir süreç olarak başlatılır — çünkü
 * güncelleme sonunda uygulama servisini yeniden başlatır; buna kendi ana
 * sürecimizin bağlı olmaması gerekir, yoksa restart güncelleyiciyi de öldürür.
 * Bu yüzden çıktı bir log dosyasına yazılır, action hemen döner.
 */
export async function guncellemeUygula(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const engel = await yoneticiMi();
  if (engel) return engel;
  try {
    const logYol = path.join(process.cwd(), "guncelle.log");
    const cikti = fs.openSync(logYol, "a");
    const alt = spawn("node", ["scripts/guncelle.mjs"], {
      cwd: process.cwd(),
      detached: true,
      stdio: ["ignore", cikti, cikti],
    });
    alt.unref();
    return { ok: true };
  } catch {
    return { ok: false, error: "Güncelleme başlatılamadı." };
  }
}
